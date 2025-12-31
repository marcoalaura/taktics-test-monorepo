export default function BudgetDetailController(
  $state,
  $stateParams,
  Budget,
  Chapter,
  Batch,
  $http
) {
  const vm = this;

  // Initialize date as Date object for AngularJS input type="date"
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  vm.budget = {
    name: '',
    thumbnail: '',
    date: today, // Date object for AngularJS input type="date"
    clientName: '',
    chapters: [],
  };
  vm.isNew = !$stateParams.id;
  vm.flatItems = []; // Array to hold chapters and batches in flat structure
  vm.editingChapter = null;
  vm.editingBatch = null;

  vm.saveBudget = saveBudget;
  vm.cancel = cancel;
  vm.addChapter = addChapter;
  vm.deleteChapter = deleteChapter;
  vm.addBatch = addBatch;
  vm.deleteBatch = deleteBatch;
  vm.updateItem = updateItem;
  vm.uploadThumbnail = uploadThumbnail;
  vm.deleteThumbnail = deleteThumbnail;
  vm.handleFileSelect = handleFileSelect;
  vm.triggerFileUpload = triggerFileUpload;
  vm.isChapter = isChapter;
  vm.isBatch = isBatch;
  vm.formatDate = formatDate;

  // Initialize
  if (vm.isNew) {
    initializeNewBudget();
  } else {
    loadBudget();
  }

  function initializeNewBudget() {
    // Set date as Date object
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    vm.budget.date = today;
    vm.budget.chapters = [];
    vm.flatItems = [];
  }

  function loadBudget() {
    Budget.findById(
      {
        id: $stateParams.id,
        filter: {
          include: [
            {
              relation: 'chapters',
              scope: {
                include: [
                  {
                    relation: 'batches',
                  },
                ],
              },
            },
          ],
        },
      },
      function(budget) {
        vm.budget = budget;
        // Ensure date is a Date object for input type="date"
        if (budget.date) {
          const d = new Date(budget.date);
          d.setHours(0, 0, 0, 0);
          vm.budget.date = d;
        } else {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          vm.budget.date = today;
        }
        buildFlatItems();
      },
      function(error) {
        console.error('Error loading budget:', error);
        alert('Error al cargar el presupuesto');
      }
    );
  }

  function buildFlatItems() {
    vm.flatItems = [];
    if (!vm.budget.chapters) return;

    vm.budget.chapters
      .sort((a, b) => a.rank - b.rank)
      .forEach(function(chapter) {
        // Add chapter
        vm.flatItems.push({
          type: 'chapter',
          data: chapter,
        });

        // Add batches for this chapter
        if (chapter.batches && chapter.batches.length > 0) {
          chapter.batches
            .sort((a, b) => a.rank - b.rank)
            .forEach(function(batch) {
              vm.flatItems.push({
                type: 'batch',
                data: batch,
                chapterId: chapter.id,
              });
            });
        }
      });
  }

  function saveBudget() {
    if (vm.isNew) {
      createBudget();
    } else {
      updateBudget();
    }
  }

  function createBudget() {
    // Recalculate all totals before saving to ensure they are up to date
    recalculateAllTotals();
    
    // Ensure date is a Date object for API
    const budgetData = angular.copy(vm.budget);
    if (!(budgetData.date instanceof Date)) {
      budgetData.date = new Date(budgetData.date);
    }
    budgetData.date.setHours(0, 0, 0, 0);
    
    // First create the budget
    Budget.create(budgetData)
      .$promise.then(function(budget) {
        // Then create chapters and batches
        createChaptersAndBatches(budget.id)
          .then(function() {
            $state.go('budgets');
          })
          .catch(function(error) {
            console.error('Error creating chapters/batches:', error);
            alert('Error al crear capítulos y lotes');
          });
      })
      .catch(function(error) {
        console.error('Error creating budget:', error);
        alert('Error al crear el presupuesto');
      });
  }

  function updateBudget() {
    // Recalculate all totals before saving to ensure they are up to date
    recalculateAllTotals();
    
    // Ensure date is a Date object for API
    const budgetData = angular.copy(vm.budget);
    if (!(budgetData.date instanceof Date)) {
      budgetData.date = new Date(budgetData.date);
    }
    budgetData.date.setHours(0, 0, 0, 0);
    
    Budget.prototype$updateAttributes(
      { id: vm.budget.id },
      budgetData
    )
      .$promise.then(function() {
        // Update chapters and batches
        updateChaptersAndBatches()
          .then(function() {
            $state.go('budgets');
          })
          .catch(function(error) {
            console.error('Error updating chapters/batches:', error);
            alert('Error al actualizar capítulos y lotes');
          });
      })
      .catch(function(error) {
        console.error('Error updating budget:', error);
        alert('Error al actualizar el presupuesto');
      });
  }

  function createChaptersAndBatches(budgetId) {
    const promises = [];

    vm.flatItems.forEach(function(item) {
      if (item.type === 'chapter') {
        const chapterData = angular.copy(item.data);
        chapterData.budgetId = budgetId;
        delete chapterData.id;
        delete chapterData.batches;

        const chapterPromise = Chapter.create(chapterData).$promise.then(
          function(chapter) {
            // Create batches for this chapter
            const batchPromises = [];
            vm.flatItems.forEach(function(batchItem) {
              if (
                batchItem.type === 'batch' &&
                batchItem.chapterId === item.data.id
              ) {
                const batchData = angular.copy(batchItem.data);
                batchData.chapterId = chapter.id;
                delete batchData.id;
                batchPromises.push(Batch.create(batchData).$promise);
              }
            });
            return Promise.all(batchPromises);
          }
        );
        promises.push(chapterPromise);
      }
    });

    return Promise.all(promises);
  }

  function updateChaptersAndBatches() {
    // Recalculate all totals one more time before saving to ensure they are current
    recalculateAllTotals();
    
    // Get existing chapters and batches from server
    return Budget.findById({
      id: vm.budget.id,
      filter: {
        include: [
          {
            relation: 'chapters',
            scope: {
              include: ['batches'],
            },
          },
        ],
      },
    })
      .$promise.then(function(existingBudget) {
        const existingChapters = existingBudget.chapters || [];
        const existingBatches = [];
        existingChapters.forEach(function(ch) {
          if (ch.batches) {
            existingBatches.push(...ch.batches);
          }
        });

        // First, create/update all chapters and build a map of temporary chapter references to real IDs
        const chapterPromises = [];
        const chapterIdMap = new Map(); // Maps temporary chapter objects to their real IDs

        vm.flatItems.forEach(function(item) {
          if (item.type === 'chapter') {
            const chapterData = angular.copy(item.data);
            chapterData.budgetId = vm.budget.id;
            delete chapterData.batches;
            
            // Ensure totals are included (they should be from recalculateAllTotals above)
            // Explicitly set them to make sure they're included
            if (item.data.totalCostImport !== undefined) {
              chapterData.totalCostImport = Number(item.data.totalCostImport) || 0;
            }
            if (item.data.totalSaleImport !== undefined) {
              chapterData.totalSaleImport = Number(item.data.totalSaleImport) || 0;
            }

            if (chapterData.id) {
              // Update existing chapter
              chapterIdMap.set(item.data, chapterData.id);
              chapterPromises.push(
                Chapter.prototype$updateAttributes(
                  { id: chapterData.id },
                  chapterData
                ).$promise.then(function(updatedChapter) {
                  return { tempChapter: item.data, realId: updatedChapter.id };
                })
              );
            } else {
              // Create new chapter
              const tempChapter = item.data;
              chapterPromises.push(
                Chapter.create(chapterData).$promise.then(function(newChapter) {
                  chapterIdMap.set(tempChapter, newChapter.id);
                  // Update the temp chapter with the real ID
                  tempChapter.id = newChapter.id;
                  return { tempChapter: tempChapter, realId: newChapter.id };
                })
              );
            }
          }
        });

        // Wait for all chapters to be created/updated
        return Promise.all(chapterPromises).then(function() {
          const batchPromises = [];

          // Now process batches with correct chapter IDs
          // Find the parent chapter for each batch (the last chapter before this batch in flatItems)
          vm.flatItems.forEach(function(item) {
            if (item.type === 'batch') {
              const batchData = angular.copy(item.data);
              
              // Find the parent chapter by looking backwards in flatItems
              let chapterId = null;
              const batchIndex = vm.flatItems.indexOf(item);
              
              // Look backwards from this batch to find the most recent chapter
              for (let i = batchIndex - 1; i >= 0; i--) {
                if (vm.flatItems[i].type === 'chapter') {
                  const chapterData = vm.flatItems[i].data;
                  // Use the mapped ID if available (for newly created chapters), otherwise use the existing id
                  chapterId = chapterIdMap.get(chapterData) || chapterData.id;
                  break;
                }
              }

              if (!chapterId) {
                console.error('Could not find chapterId for batch:', batchData);
                return; // Skip this batch
              }

              batchData.chapterId = chapterId;

              if (batchData.id) {
                // Update existing batch
                batchPromises.push(
                  Batch.prototype$updateAttributes({ id: batchData.id }, batchData).$promise
                );
              } else {
                // Create new batch
                batchPromises.push(Batch.create(batchData).$promise);
              }
            }
          });

          // Delete removed chapters and batches
          const currentChapterIds = vm.flatItems
            .filter(function(i) {
              return i.type === 'chapter' && i.data.id;
            })
            .map(function(i) {
              return i.data.id;
            });
          const currentBatchIds = vm.flatItems
            .filter(function(i) {
              return i.type === 'batch' && i.data.id;
            })
            .map(function(i) {
              return i.data.id;
            });

          existingChapters.forEach(function(ch) {
            if (!currentChapterIds.includes(ch.id)) {
              batchPromises.push(Chapter.deleteById({ id: ch.id }).$promise);
            }
          });

          existingBatches.forEach(function(b) {
            if (!currentBatchIds.includes(b.id)) {
              batchPromises.push(Batch.deleteById({ id: b.id }).$promise);
            }
          });

          return Promise.all(batchPromises);
        });
      });
  }

  function addChapter() {
    const newRank =
      vm.budget.chapters.length > 0
        ? Math.max(...vm.budget.chapters.map((c) => c.rank || 0)) + 1
        : 1;

    const newChapter = {
      rank: newRank,
      description: 'Chapter ' + newRank,
      materialSaleCoefficient: 1.5,
      labourSaleCoefficient: 1.5,
      totalCostImport: 0,
      totalSaleImport: 0,
      batches: [],
    };

    if (!vm.budget.chapters) {
      vm.budget.chapters = [];
    }
    vm.budget.chapters.push(newChapter);
    buildFlatItems();
  }

  function deleteChapter(chapter) {
    if (!confirm('¿Está seguro de eliminar este capítulo y todos sus lotes?')) {
      return;
    }

    // Remove from flatItems
    vm.flatItems = vm.flatItems.filter(function(item) {
      return !(
        (item.type === 'chapter' && item.data === chapter) ||
        (item.type === 'batch' && item.chapterId === chapter.id)
      );
    });

    // Remove from chapters array
    const index = vm.budget.chapters.indexOf(chapter);
    if (index > -1) {
      vm.budget.chapters.splice(index, 1);
    }

    // Rebuild ranks
    rebuildRanks();
  }

  function addBatch(chapter) {
    const chapterBatches = vm.flatItems.filter(function(item) {
      return item.type === 'batch' && item.chapterId === chapter.id;
    });

    const newRank =
      chapterBatches.length > 0
        ? Math.max(...chapterBatches.map((b) => b.data.rank || 0)) + 0.1
        : parseFloat(chapter.rank) + 0.1;

    const newBatch = {
      rank: newRank,
      description: 'Batch ' + newRank,
      amount: 0,
      materialCostImport: 0,
      labourCostImport: 0,
      unitaryCostImport: 0,
      totalCostImport: 0,
      unitarySaleCost: 0,
      totalSaleImport: 0,
      chapterId: chapter.id,
    };

    // Find chapter index in flatItems
    const chapterIndex = vm.flatItems.findIndex(function(item) {
      return item.type === 'chapter' && item.data === chapter;
    });

    // Insert batch after chapter or after last batch of this chapter
    let insertIndex = chapterIndex + 1;
    for (let i = chapterIndex + 1; i < vm.flatItems.length; i++) {
      if (vm.flatItems[i].type === 'chapter') {
        break;
      }
      if (
        vm.flatItems[i].type === 'batch' &&
        vm.flatItems[i].chapterId === chapter.id
      ) {
        insertIndex = i + 1;
      }
    }

    vm.flatItems.splice(insertIndex, 0, {
      type: 'batch',
      data: newBatch,
      chapterId: chapter.id,
    });

    if (!chapter.batches) {
      chapter.batches = [];
    }
    chapter.batches.push(newBatch);
  }

  function deleteBatch(batch, chapterId) {
    if (!confirm('¿Está seguro de eliminar este lote?')) {
      return;
    }

    // Remove from flatItems
    vm.flatItems = vm.flatItems.filter(function(item) {
      return !(item.type === 'batch' && item.data === batch);
    });

    // Remove from chapter batches
    const chapter = vm.budget.chapters.find(function(c) {
      return c.id === chapterId || c === vm.flatItems.find(function(item) {
        return item.type === 'chapter' && item.data.batches;
      });
    });
    if (chapter && chapter.batches) {
      const index = chapter.batches.indexOf(batch);
      if (index > -1) {
        chapter.batches.splice(index, 1);
      }
    }

    // Rebuild ranks for remaining batches in chapter
    rebuildRanks();
  }

  function updateItem(item) {
    if (item.type === 'batch') {
      calculateBatchTotals(item.data);
      // Then recalculate chapter totals
      const chapter = findChapterForBatch(item.data);
      if (chapter) {
        calculateChapterTotals(chapter);
      }
      // Then recalculate budget totals
      calculateBudgetTotals();
    } else if (item.type === 'chapter') {
      // When chapter coefficients change, recalculate all batches in this chapter
      const batches = vm.flatItems.filter(function(batchItem) {
        return batchItem.type === 'batch' && batchItem.chapterId === item.data.id;
      });
      batches.forEach(function(batchItem) {
        calculateBatchTotals(batchItem.data);
      });
      calculateChapterTotals(item.data);
      calculateBudgetTotals();
    }
  }

  function findChapterForBatch(batch) {
    // Find the chapter that contains this batch
    const batchIndex = vm.flatItems.findIndex(function(item) {
      return item.type === 'batch' && item.data === batch;
    });
    if (batchIndex === -1) return null;

    // Look backwards to find the parent chapter
    for (let i = batchIndex - 1; i >= 0; i--) {
      if (vm.flatItems[i].type === 'chapter') {
        return vm.budget.chapters.find(function(c) {
          return c === vm.flatItems[i].data || c.id === vm.flatItems[i].data.id;
        });
      }
    }
    return null;
  }

  function recalculateAllTotals() {
    // First, recalculate all batch totals
    vm.flatItems.forEach(function(item) {
      if (item.type === 'batch') {
        calculateBatchTotals(item.data);
      }
    });

    // Then, recalculate all chapter totals
    vm.flatItems.forEach(function(item) {
      if (item.type === 'chapter') {
        calculateChapterTotals(item.data);
      }
    });

    // Finally, recalculate budget totals
    calculateBudgetTotals();
  }

  function calculateBatchTotals(batch) {
    const materialCost = Number(batch.materialCostImport) || 0;
    const labourCost = Number(batch.labourCostImport) || 0;
    const amount = Number(batch.amount) || 0;

    // Find parent chapter for coefficients
    const chapter = findChapterForBatch(batch);
    const materialCoeff = chapter && chapter.materialSaleCoefficient
      ? Number(chapter.materialSaleCoefficient)
      : 1.0;
    const labourCoeff = chapter && chapter.labourSaleCoefficient
      ? Number(chapter.labourSaleCoefficient)
      : 1.0;

    // Calculate unitary cost
    batch.unitaryCostImport = materialCost + labourCost;

    // Calculate total cost
    batch.totalCostImport = batch.unitaryCostImport * amount;

    // Calculate unitary sale
    batch.unitarySaleCost =
      materialCost * materialCoeff + labourCost * labourCoeff;

    // Calculate total sale
    batch.totalSaleImport = batch.unitarySaleCost * amount;
  }

  function calculateChapterTotals(chapter) {
    // Find all batches for this chapter
    const chapterIndex = vm.flatItems.findIndex(function(item) {
      return item.type === 'chapter' && (item.data === chapter || item.data.id === chapter.id);
    });
    
    const batches = [];
    if (chapterIndex !== -1) {
      // Get all batches that come after this chapter until the next chapter
      for (let i = chapterIndex + 1; i < vm.flatItems.length; i++) {
        if (vm.flatItems[i].type === 'chapter') {
          break;
        }
        if (vm.flatItems[i].type === 'batch') {
          batches.push(vm.flatItems[i].data);
        }
      }
    }

    let totalCost = 0;
    let totalSale = 0;

    batches.forEach(function(batch) {
      totalCost += Number(batch.totalCostImport) || 0;
      totalSale += Number(batch.totalSaleImport) || 0;
    });

    chapter.totalCostImport = totalCost;
    chapter.totalSaleImport = totalSale;
  }

  function calculateBudgetTotals() {
    let totalCost = 0;
    let totalSale = 0;

    vm.budget.chapters.forEach(function(chapter) {
      totalCost += Number(chapter.totalCostImport) || 0;
      totalSale += Number(chapter.totalSaleImport) || 0;
    });

    vm.budget.totalCostImport = totalCost;
    vm.budget.totalSaleImport = totalSale;
  }

  function rebuildRanks() {
    let chapterRank = 1;
    vm.flatItems.forEach(function(item) {
      if (item.type === 'chapter') {
        item.data.rank = chapterRank;
        chapterRank++;
      } else if (item.type === 'batch') {
        // Find parent chapter rank
        let parentChapterRank = 1;
        for (let i = vm.flatItems.indexOf(item) - 1; i >= 0; i--) {
          if (vm.flatItems[i].type === 'chapter') {
            parentChapterRank = vm.flatItems[i].data.rank;
            break;
          }
        }
        item.data.rank = parseFloat(parentChapterRank) + 0.1;
      }
    });
  }

  function handleFileSelect(files) {
    if (!files || files.length === 0) return;
    uploadThumbnail(files[0]);
  }

  function triggerFileUpload() {
    document.getElementById('thumbnailUpload').click();
  }

  function uploadThumbnail(file) {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    // Use default API URL or get from environment
    const urlBase = '/api'; // Default API base URL
    $http
      .post(urlBase + '/containers/budget-thumbnails/upload', formData, {
        headers: {
          'Content-Type': undefined,
        },
        transformRequest: angular.identity,
      })
      .then(function(response) {
        if (response.data && response.data.result && response.data.result.files && response.data.result.files.file) {
          const fileUrl = response.data.result.files.file[0].providerResponse.location;
          vm.budget.thumbnail = fileUrl;
        } else {
          alert('Error al subir la imagen');
        }
      })
      .catch(function(error) {
        console.error('Error uploading thumbnail:', error);
        alert('Error al subir la imagen');
      });
  }

  function deleteThumbnail() {
    if (confirm('¿Está seguro de eliminar la miniatura?')) {
      vm.budget.thumbnail = '';
    }
  }

  function isChapter(item) {
    return item.type === 'chapter';
  }

  function isBatch(item) {
    return item.type === 'batch';
  }

  function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function cancel() {
    $state.go('budgets');
  }
}

BudgetDetailController.$inject = [
  '$state',
  '$stateParams',
  'Budget',
  'Chapter',
  'Batch',
  '$http',
];

