'use strict';

fifoApp.controller('VmCtrl', function($scope, $routeParams, $location, wiggle, vmService, modal, status) {

    var uuid = $routeParams.uuid;

    var updateVm = function(cb) {
        wiggle.vms.get({id: uuid}, function(res) {
            $scope.vm = vmService.updateCustomFields(res);
            /* Build the snapshots array */
            $scope.snapshots = []
            Object.keys($scope.vm.snapshots|| []).forEach(function(k) {
                var val = $scope.vm.snapshots[k]
                val.uuid = k
                $scope.snapshots.push(val)
            })
            $scope.snapshots = $scope.vm.snapshots
        })
    }

    updateVm()

    $scope.$on('state', function(e, msg) {
        $scope.vm.state = msg.message.data
        vmService.updateCustomFields($scope.vm)
        $scope.$apply()
    })

    $scope.$on('delete', function(e, msg) {
        $location.path('/virtual-machines')
        $scope.$apply()
    })

    $scope.action = function(action, vm) {
        vmService.executeAction(action, vm.uuid, vm.config && vm.config.alias, function() {
            if (action=='delete')
                $location.path('/virtual-machines')
        })
    }

    $scope.vnc = function(vm) {
        window.open("vnc.html?uuid=" + vm.uuid)
    }

    $scope.snapshot = function(action, snap) {
        switch (action) {

            case 'create':
                var comment = prompt('Write a comment for the new snapshot:');
                wiggle.vms.save({id: uuid, controller: 'snapshots'}, {comment: comment},
                    function success(data, h) {
                        status.update('Snapshot created', {info: true});
                        updateVm()
                    },
                    function error(data) {
                        alert('Error saving the snapshot. See your console')
                        console.log(data)
                    });

                break;

            case 'delete':
                modal.confirm({
                    btnClass: 'btn-info',
                    btnText: 'Delete',
                    header: 'Confirm Snapshot Deletion',
                    body: '<p>Are you sure you want to delete snapshot <strong>' + snap.comment + '</strong> dated ' + new Date(snap.timestamp/1000) + '</p>'
                }, function() {
                    $scope.$apply()
                    wiggle.vms.delete({id: uuid, controller: 'snapshots', second_id: snap.uuid},
                        function success() {
                            status.update('Snapshot ' + snap.comment + ' deleted', {info: true});
                            delete $scope.snapshots[snap.uuid]
                            updateVm()
                        },
                        function error(data) {
                            alert('Error deleting the snapshot. See your console')
                            console.log(data)
                        })
                })
                break;

            case 'rollback':
                modal.confirm({
                    btnClass: 'btn-danger btn-warning',
                    btnText: 'Rollback',
                    header: 'Confirm Rollback',
                    body: '<p><font color="red">Warning!</font> You are about to rollback to snapshot <strong>' + snap.comment + '</strong> dated ' + new Date(snap.timestamp/1000) + '?</p>' +
                        '<p>Please note: Any snapshots that have been taken after this rollback date will be deleted if you proceed.</p>' +
                        "</b>Are you 100% sure you really want to do this?</p>"
                }, function() {
                    status.update('Will rollback to snapshot ' + snap.comment, {info: true});
                    $scope.$apply()
                    wiggle.vms.put({id: uuid, controller: 'snapshots', second_id: snap.uuid}, {action: 'rollback'},
                        function sucess () {
                            updateVm()
                            alert('Rollback done')
                        },
                        function error (data) {
                            alert('Error when rolling back. See the history')
                            console.log(data)
                        })
                })
                break;
        }

    }
});
