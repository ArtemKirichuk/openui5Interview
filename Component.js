sap.ui.define(['sap/ui/core/UIComponent'],
	function(UIComponent) {
	"use strict";

	var Component = UIComponent.extend("sap.m.sample.TableEditable.Component", {

		metadata : {
			manifest: "json"
		},
		init: function () {
			UIComponent.prototype.init.apply(this, arguments);
            this.getRouter().attachRouteMatched(this._onRoute, this);
            this.getRouter().initialize();
		},
		_onRoute: function (e) { //oData - cобытие перехода по маршруту
            // var oArg = e.getParameter('arguments'); // передаваемые параметры
            // var sRoute = e.getParameter('name'); // наименование перехода маршрута

        },
		createContent: function () {
            // create root view
            return sap.ui.view("AppView", {
                viewName: "sap.m.sample.TableEditable.App",
                type: "XML"
            });
        }
	});
	
	return Component;

});
