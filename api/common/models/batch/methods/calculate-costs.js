/**
 * Calculate batch costs and sale imports
 * @param {Batch} Batch - The Batch model
 */
const CalculateCosts = Batch => {
  return { register };

  function register() {
    // Calculate before save
    Batch.observe('before save', function(ctx, next) {
      const promise = ctx.instance 
        ? calculateBatchFields(ctx.instance)
        : calculateBatchFields(ctx.data);
      
      promise
        .then(() => next())
        .catch(err => next(err));
    });
  }

  async function calculateBatchFields(batch) {
    const materialCost = Number(batch.materialCostImport) || 0;
    const labourCost = Number(batch.labourCostImport) || 0;
    const amount = Number(batch.amount) || 0;

    // Calculate unitary cost import (always material + labour)
    batch.unitaryCostImport = materialCost + labourCost;

    // Calculate total cost import
    batch.totalCostImport = batch.unitaryCostImport * amount;

    // Get chapter to access sale coefficients for sale calculations
    let materialCoeff = 1.0;
    let labourCoeff = 1.0;

    if (batch.chapterId) {
      try {
        const Chapter = Batch.app.models.Chapter;
        const chapter = await Chapter.findById(batch.chapterId);
        
        if (chapter) {
          materialCoeff = Number(chapter.materialSaleCoefficient) || 1.0;
          labourCoeff = Number(chapter.labourSaleCoefficient) || 1.0;
        }
      } catch (error) {
        console.error('Error loading chapter for batch calculation:', error);
        // Use default coefficients
      }
    }

    // Calculate unitary sale cost (with coefficients)
    batch.unitarySaleCost = (materialCost * materialCoeff) + (labourCost * labourCoeff);

    // Calculate total sale import
    batch.totalSaleImport = batch.unitarySaleCost * amount;
  }
};

module.exports = CalculateCosts;

