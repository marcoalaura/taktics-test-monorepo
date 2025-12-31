const CalculateCosts = require('./batch/methods/calculate-costs');

module.exports = function(Batch) {
  CalculateCosts(Batch).register();

  // After batch is saved, recalculate chapter totals
  Batch.observe('after save', function(ctx, next) {
    const chapterId = ctx.instance ? ctx.instance.chapterId : (ctx.data ? ctx.data.chapterId : null);
    
    if (chapterId) {
      const Chapter = Batch.app.models.Chapter;
      Chapter.recalculateTotals(chapterId)
        .then(() => next())
        .catch(err => {
          console.error('Error recalculating chapter after batch save:', err);
          next(); // Continue even if recalculation fails
        });
    } else {
      next();
    }
  });

  // After batch is deleted, recalculate chapter totals
  Batch.observe('after delete', function(ctx, next) {
    if (ctx.instance && ctx.instance.chapterId) {
      const Chapter = Batch.app.models.Chapter;
      Chapter.recalculateTotals(ctx.instance.chapterId)
        .then(() => next())
        .catch(err => {
          console.error('Error recalculating chapter after batch delete:', err);
          next(); // Continue even if recalculation fails
        });
    } else {
      next();
    }
  });
};

