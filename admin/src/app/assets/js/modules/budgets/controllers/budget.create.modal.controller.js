export default function BudgetCreateModalController(
  $scope,
  Budget,
  $state,
  $rootScope
) {
  const vm = this;

  // Initialize date - format as YYYY-MM-DD string for input type="date"
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateString = year + '-' + month + '-' + day;

  vm.budget = {
    name: '',
    clientName: '',
    date: dateString, // String in YYYY-MM-DD format for input type="date"
    thumbnail: '',
    totalCostImport: 0,
    totalSaleImport: 0,
  };
  vm.creating = false;

  vm.create = create;
  vm.cancel = cancel;

  function create() {
    if (!vm.budget.name || !vm.budget.clientName || !vm.budget.date) {
      alert('Por favor, complete todos los campos requeridos');
      return;
    }

    vm.creating = true;

    // Convert date string from input type="date" (YYYY-MM-DD) to Date object
    let budgetDate;
    if (typeof vm.budget.date === 'string') {
      // Input type="date" returns string in YYYY-MM-DD format
      budgetDate = new Date(vm.budget.date + 'T00:00:00');
    } else if (Object.prototype.toString.call(vm.budget.date) === '[object Date]') {
      budgetDate = new Date(vm.budget.date);
    } else {
      budgetDate = new Date();
    }
    
    // Ensure time is set to midnight to avoid timezone issues
    budgetDate.setHours(0, 0, 0, 0);

    const budgetData = {
      name: vm.budget.name,
      clientName: vm.budget.clientName,
      date: budgetDate,
      thumbnail: vm.budget.thumbnail || '',
      totalCostImport: 0,
      totalSaleImport: 0,
    };

    Budget.create(budgetData)
      .$promise.then(function(budget) {
        vm.creating = false;
        // Broadcast event with created budget
        $rootScope.$broadcast('budget.created', budget);
        // Close modal
        $scope.$hide();
        // Navigate to edit page
        $state.go('budget-edit', { id: budget.id });
      })
      .catch(function(error) {
        console.error('Error creating budget:', error);
        alert(
          'Error al crear el presupuesto: ' +
            (error.data?.error?.message ||
              error.message ||
              'Error desconocido')
        );
        vm.creating = false;
      });
  }

  function cancel() {
    $scope.$hide();
  }
}

BudgetCreateModalController.$inject = ['$scope', 'Budget', '$state', '$rootScope'];

