/**
 * Calculate budget totals from chapters
 * @param {Budget} Budget - The Budget model
 */
const CalculateTotals = Budget => {
  return { register };

  function register() {
    // Register remote method to manually recalculate
    Budget.recalculateTotals = recalculateBudgetTotals;
  }

  async function recalculateBudgetTotals(budgetId) {
    const Chapter = Budget.app.models.Chapter;
    
    try {
      const chapters = await Chapter.find({
        where: { budgetId: budgetId }
      });

      let totalCostImport = 0;
      let totalSaleImport = 0;

      chapters.forEach(chapter => {
        totalCostImport += Number(chapter.totalCostImport) || 0;
        totalSaleImport += Number(chapter.totalSaleImport) || 0;
      });

      await Budget.update(
        { id: budgetId },
        {
          totalCostImport: totalCostImport,
          totalSaleImport: totalSaleImport
        }
      );
    } catch (error) {
      console.error('Error recalculating budget totals:', error);
      throw error;
    }
  }
};

module.exports = CalculateTotals;

