/**
 * Calculate chapter totals from batches
 * @param {Chapter} Chapter - The Chapter model
 */
const CalculateTotals = Chapter => {
  return { register };

  function register() {
    // Register method to manually recalculate
    Chapter.recalculateTotals = recalculateChapterTotals;
    
    // After chapter totals are recalculated (from batch changes), recalculate budget
    // This is called from batch observers, so we don't need to observe chapter save here
    // to avoid double calculation
  }

  async function recalculateChapterTotals(chapterId) {
    const Batch = Chapter.app.models.Batch;
    
    try {
      const batches = await Batch.find({
        where: { chapterId: chapterId }
      });

      let totalCostImport = 0;
      let totalSaleImport = 0;

      batches.forEach(batch => {
        totalCostImport += Number(batch.totalCostImport) || 0;
        totalSaleImport += Number(batch.totalSaleImport) || 0;
      });

      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        return;
      }

      await Chapter.update(
        { id: chapterId },
        {
          totalCostImport: totalCostImport,
          totalSaleImport: totalSaleImport
        }
      );

      // After updating chapter totals, recalculate budget totals
      if (chapter.budgetId) {
        const Budget = Chapter.app.models.Budget;
        await Budget.recalculateTotals(chapter.budgetId);
      }
    } catch (error) {
      console.error('Error recalculating chapter totals:', error);
      throw error;
    }
  }
};

module.exports = CalculateTotals;

