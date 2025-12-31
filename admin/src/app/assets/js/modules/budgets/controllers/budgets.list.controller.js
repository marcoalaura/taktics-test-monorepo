export default function BudgetsListController(
  $state,
  Budget,
  $filter,
  $modal,
  $rootScope,
  $timeout
) {
  const vm = this;

  vm.budgets = [];
  vm.filteredBudgets = [];
  vm.filters = {
    name: '',
    clientName: '',
    dateFrom: null,
    dateTo: null,
  };

  // Listen for budget creation event
  $rootScope.$on('budget.created', function(event, budget) {
    loadBudgets();
  });

  vm.loadBudgets = loadBudgets;
  vm.applyFilters = applyFilters;
  vm.clearFilters = clearFilters;
  vm.editBudget = editBudget;
  vm.deleteBudget = deleteBudget;
  vm.createBudget = createBudget;
  vm.formatDate = formatDate;

  // Initialize
  loadBudgets();

  function loadBudgets() {
    Budget.find({
      include: ['chapters'],
    })
      .$promise.then(function(budgets) {
        vm.budgets = budgets;
        applyFilters();
      })
      .catch(function(error) {
        console.error('Error loading budgets:', error);
      });
  }

  function applyFilters() {
    vm.filteredBudgets = $filter('filter')(vm.budgets, function(budget) {
      // Filter by name
      if (
        vm.filters.name &&
        !budget.name
          .toLowerCase()
          .includes(vm.filters.name.toLowerCase())
      ) {
        return false;
      }

      // Filter by client name
      if (
        vm.filters.clientName &&
        !budget.clientName
          .toLowerCase()
          .includes(vm.filters.clientName.toLowerCase())
      ) {
        return false;
      }

      // Filter by date range
      if (vm.filters.dateFrom || vm.filters.dateTo) {
        const budgetDate = new Date(budget.date);
        budgetDate.setHours(0, 0, 0, 0);

        if (vm.filters.dateFrom) {
          const fromDate = new Date(vm.filters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (budgetDate < fromDate) {
            return false;
          }
        }

        if (vm.filters.dateTo) {
          const toDate = new Date(vm.filters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (budgetDate > toDate) {
            return false;
          }
        }
      }

      return true;
    });
  }

  function clearFilters() {
    vm.filters = {
      name: '',
      clientName: '',
      dateFrom: null,
      dateTo: null,
    };
    applyFilters();
  }

  function editBudget(budget) {
    $state.go('budget-edit', { id: budget.id });
  }

  function deleteBudget(budget) {
    if (
      confirm(
        '¿Está seguro de eliminar el presupuesto "' +
          budget.name +
          '"?\n\nEsta acción no se puede deshacer.'
      )
    ) {
      Budget.deleteById({ id: budget.id })
        .$promise.then(function() {
          loadBudgets();
        })
        .catch(function(error) {
          console.error('Error deleting budget:', error);
          alert('Error al eliminar el presupuesto');
        });
    }
  }

  function createBudget() {
    // Navigate to create page instead of using modal
    // This is more reliable than trying to fix angular-strap modal issues
    $state.go('budget-create');
  }

  function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }
}

BudgetsListController.$inject = [
  '$state',
  'Budget',
  '$filter',
  '$modal',
  '$rootScope',
  '$timeout',
];

