const CalculateTotals = require('./chapter/methods/calculate-totals');

module.exports = function(Chapter) {
  CalculateTotals(Chapter).register();

  // After chapter is created/updated, recalculate its totals from batches
  Chapter.observe('after save', function(ctx, next) {
    const chapterId = ctx.instance ? ctx.instance.id : (ctx.where ? ctx.where.id : null);
    
    if (chapterId) {
      Chapter.recalculateTotals(chapterId)
        .then(() => next())
        .catch(err => {
          console.error('Error recalculating chapter after save:', err);
          next(); // Continue even if recalculation fails
        });
    } else {
      next();
    }
  });

  // After chapter is deleted, recalculate budget totals
  Chapter.observe('after delete', function(ctx, next) {
    if (ctx.instance && ctx.instance.budgetId) {
      const Budget = Chapter.app.models.Budget;
      Budget.recalculateTotals(ctx.instance.budgetId)
        .then(() => next())
        .catch(err => {
          console.error('Error recalculating budget after chapter delete:', err);
          next(); // Continue even if recalculation fails
        });
    } else {
      next();
    }
  });
};

