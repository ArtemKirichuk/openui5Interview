sap.ui.define([
	'sap/ui/core/util/Export',
	'sap/ui/core/util/ExportTypeCSV',
	'sap/base/util/deepExtend',
	'./Formatter',
	'sap/ui/core/mvc/Controller',
	'sap/ui/model/json/JSONModel',
	'sap/m/ColumnListItem',
	'sap/m/Input',
	'sap/m/MessageToast',
	"sap/ui/core/Popup",
	'sap/ui/core/Fragment',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator',
	"sap/ui/core/format/DateFormat",
	"sap/ui/core/Item",
	'sap/m/MessageBox',

], function (
	Export,
	ExportTypeCSV,
	deepExtend,
	Formatter,
	Controller,
	JSONModel,
	ColumnListItem,
	Input,
	MessageToast,
	Popup,
	Fragment,
	Filter,
	FilterOperator,
	DateFormat,
	Item,
	MessageBox
) {
	"use strict";

	var TableController = Controller.extend("sap.m.sample.TableEditable.Table", {

		onInit: function (evt) {
			const oDateFormat = DateFormat.getDateInstance({ source: { pattern: "ddMMyyyy" }, pattern: "dd.MM.yyyy" });

			this.i18n = this.getOwnerComponent().getModel('i18n').getResourceBundle();
			let sUrl = sap.ui.require.toUrl("sap/ui/demo/mock/data.json")
			this.oModel = new JSONModel(sUrl);
			this.oModel.dataLoaded().then(function (e) {
				this.oModel.oData.tasks.forEach((e) => {
					e.dateStart = oDateFormat.parse(e.dateStart);
					e.dateEnd = oDateFormat.parse(e.dateEnd);
				})
				this.getView().setModel(this.oModel);
				this.atasks = deepExtend([], this.oModel.getProperty("/tasks"));
			}.bind(this))
			this.oTable = this.byId("idTaskTable");

			this.oReadOnlyTemplate = this.byId("idTaskTable").removeItem(0);

			this.fnInitColModel();
			this.rebindTable(this.oReadOnlyTemplate, "Navigation");

			this.oEditableTemplate = new ColumnListItem({
				cells: [
					new Input({ value: "{nameTask}" }),
					new sap.m.ComboBox({
						items: {
							path: '/Filters/0/values',
							template: new Item({ key: "{text}", text: "{text}" }),
							templateShareable: false
						},
						selectedKey: "{typeTask}"


					}),
					// new Input({ value: "{typeTask}" }),
					new Input({ value: "{developer}" }),
					new sap.m.DatePicker({
						dateValue: "{dateStart}",
						displayFormat: "dd.MM.yyyy"
					}),
					new sap.m.DatePicker({
						dateValue: "{dateEnd}",
						displayFormat: "dd.MM.yyyy"
					})
				]
			});
			this.getRouter().getRoute('display').attachEvent('matched', this.fnRouteDisplay, this);
			this.getRouter().getRoute('edit').attachEvent('matched', this.fnRouteEdit, this);
		},
		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},
		fnRouteEdit: function () {
			this.fnShowAllCol();
			// this.atasks = deepExtend([], this.oModel.getProperty("/tasks"));
			this.rebindTable(this.oEditableTemplate, "Edit");
		},
		fnRouteDisplay: function () {
			this.rebindTable(this.oReadOnlyTemplate, "Navigation");
		},
		fnInitColModel: function () {
			this.oColumnsInfo = {}
			this.oColumnsInfo.SelectedKey = []

			this.oColumnsInfo.aColumns = this.oTable.getColumns().map((e, i) => {
				let sParam = i
				let sValue = e.getHeader().mBindingInfos.text.parts[0].path
				this.oColumnsInfo.SelectedKey.push(sParam);
				return { name: sValue, id: sParam }

			})
			this.oColumns = new JSONModel(this.oColumnsInfo);
			this.getView().setModel(this.oColumns, 'oColumnsInfo');
		},
		// Edit, Display
		rebindTable: function (oTemplate, sKeyboardMode) {
			this.oTable.bindItems({
				path: "/tasks",
				template: oTemplate,
				templateShareable: true
			}).setKeyboardMode(sKeyboardMode);
			this.fnToggleMode(sKeyboardMode == 'Edit' ? true : false)
		},
		fnToggleMode: function (bEdit) {
			this.byId("editButton").setVisible(!bEdit);
			this.byId("saveButton").setVisible(bEdit);
			this.byId("cancelButton").setVisible(bEdit);
			this.byId("addUserButton").setVisible(bEdit);
			this.byId("idSettings").setVisible(!bEdit);
			this.byId("excelButton").setVisible(!bEdit);
		},
		//column show/hide
		onOpenColumnManager: function (oEvent) {
			var oButton = oEvent.getSource(),
				oView = this.getView();
			if (!this._pDialog) {
				this._pDialog = Fragment.load({
					id: oView.getId(),
					name: "sap.m.sample.TableEditable.fragment.dialogColumns",
					controller: this
				}).then(function (Dialog) {
					oView.addDependent(Dialog);
					return Dialog;
				}.bind(this));
			}
			this._pDialog.then(function (Dialog) {
				Dialog.open();
			});
		},

		//Filter 
		onSearch: function (oEvent) {
			let oBinding = this.oTable.getBinding("items");

			oBinding.filter(this.fnGetFilters());

		},
		fnGetFilters: function () {
			let comboBoxValue = this.byId("oFilterTypeTask").getValue(),
				inputDeveloper = this.byId("userInput").getValue(),
				DPStart = this.byId("DPStart").getDateValue(),
				DPEnd = this.byId("DPEnd").getDateValue(),

				aFilters = [];
			if (comboBoxValue)
				aFilters.push(new Filter("typeTask", "EQ", comboBoxValue))
			if (inputDeveloper)
				aFilters.push(new Filter("developer", "EQ", inputDeveloper));

			if (DPStart)
				aFilters.push(new Filter("dateStart", FilterOperator.EQ, DPStart));
			if (DPEnd)
				aFilters.push(new Filter("dateEnd", FilterOperator.EQ, DPEnd));
			return aFilters
		},
		//Reset
		onReset: function (oEvent) {
			this.fnClearFilter();
			this.fnShowAllCol();
		},
		fnShowAllCol: function () {
			let aListColumns = this.oView.byId('idTaskTable').getItems()
			//reset Dialog
			aListColumns.forEach((e) => {
				e.setSelected(true)
			})
			//show col
			this.oTable.getColumns().forEach((element) => {
				element.setVisible(true);
			});
		},
		fnClearFilter: function () {
			let oBinding = this.oTable.getBinding("items");
			oBinding.filter([]);
			this.byId("oFilterTypeTask").setSelectedItem(null);
			this.byId("userInput").setSelectedItem(null);
			this.byId("DPStart").setValue(null);
			this.byId("DPEnd").setValue(null);
			this.byId('idUsrList').removeSelections()
		},
		// User
		fnUserDialog: function (oEvent) {
			let sInputValue = oEvent.getSource().getValue(),
				oView = this.getView();
			if (!this._pValueHelpDialog) {
				this._pValueHelpDialog = Fragment.load({
					id: oView.getId(),
					name: "sap.m.sample.TableEditable.fragment.userDialog",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}
			this._pValueHelpDialog.then(function (oDialog) {
				oDialog.open();
			});
		},
		//DP
		fnChDate: function (oEvent) {
			let oDP = oEvent.getSource(),
				bValid = oEvent.getParameter("valid");
			if (bValid) {
				oDP.setValueState('None');
			} else {
				oDP.setValueState('Error');
			}
		},
		fnSelectDeveloper: function (oEvent) {
			var oSelectedItem = oEvent.mParameters.listItem;
			if (!oSelectedItem) {
				return;
			}
			this.byId("userInput").setValue(oSelectedItem.getTitle());
			this.oView.byId('selectDialog').close()
		},
		//Create
		onCreate: function () {
			var oList = this.byId("idTaskTable"),

				oBinding = oList.getBinding("items");
			// Create a new row
			this.oModel.oData.tasks.unshift({
				"nameTask": "",
				"typeTask": "",
				"developer": "",
				"dateStart": new Date(),
				"dateEnd": null
			})
			this.oModel.updateBindings()
		},

		//show,hide col
		fnToggleColumn: function (e) {
			let sPath = e.mParameters.listItem.getBindingContextPath()
			let oItem = this.oColumns.getObject(sPath)
			let bVisible = this.oTable.getColumns()[oItem.id].getVisible()
			this.oTable.getColumns()[oItem.id].setVisible(!bVisible)
		},
		onEdit: function () {
			this.getRouter().navTo("edit")
		},
		//Save
		onSave: function () {
			if (!this.fnCheckTable()) {
				return
			}
			this.getRouter().navTo("display")
		},
		//Check
		fnCheckTable: function () {
			let bEmpty = false,
				bBadDate = false,
				oModel = this.oModel;
			// Покраска ячеек
			this.oTable.getItems().forEach((e)=>{
				let oRow = oModel.getProperty(e.getBindingContext().sPath); 
				bBadDate = false;
				if (oRow.dateEnd && oRow.dateStart && oRow.dateStart.getTime() > oRow.dateEnd.getTime()) {
					bBadDate = true
				}
				e.getCells().forEach((e2)=>{
					let v = e2.getValue() 
					if(!v){
						bEmpty = true
						e2.addStyleClass('error')
					}
					if(bBadDate && e2.getDateValue){
						e2.addStyleClass('error')
					}
					
				}) 
			})
			// this.oModel.oData.tasks.forEach((e) => {
			// 	for (let key in e) {
			// 		if (!e[key]) {
			// 			bEmpty = true
			// 		}
			// 		this.oTable.getItems()[0].getCells()[0].addStyleClass('error')
			// 	}

			// 	if (e.dateEnd && e.dateStart && e.dateStart.getTime() > e.dateEnd.getTime()) {
			// 		bBadDate = true
			// 	}

			// })
			if (bEmpty || bBadDate) {
				let sEmpty = bEmpty ? '1. ' + this.i18n.getText('iEmpty') : '';
				let sDate = bBadDate ? '2. ' + this.i18n.getText('iDateError') : '';
				MessageBox.error(sEmpty + '. \n' + sDate);

			}
			return !bEmpty && !bBadDate
		},

		onCancel: function () {
			this.getRouter().navTo("display")
			this.oModel.setProperty("/tasks", this.atasks);
		},

		onExit: function () {
			this.atasks = [];
			this.oEditableTemplate.destroy();
			this.oModel.destroy();
		},

		onPaste: function (oEvent) {
			var aData = oEvent.getParameter("data");
			MessageToast.show("Pasted Data: " + aData);
		},
		// Data export 
		onExcel: function (oEvent) {

			var oExport = new Export({

				// Type that will be used to generate the content. Own ExportType's can be created to support other formats
				exportType: new ExportTypeCSV({
					separatorChar: ";"
				}),
				// exportType: new ExportTypeCSV({
				// 	separatorChar: "\t",
				// 	 mimeType: "application/ms-excel",
				// 	 charset: "utf-8",
				// 	 fileExtension: "xls"
				// }),

				// Pass in the model created above
				models: this.getView().getModel(),

				// binding information for the rows aggregation
				rows: {
					path: "/tasks",
					filters: this.oTable.getBinding('items').aFilters
				},
				// column definitions with column name and binding info for the content
				columns: [{
					name: this.i18n.getText('colNameTask'),
					template: { content: "{nameTask}" }
				},
				{
					name: this.i18n.getText('colTypeTask'),
					template: { content: "{typeTask}" }
				},
				{
					name: this.i18n.getText('colDeveloper'),
					template: { content: "{developer}" }
				},
				{
					name: this.i18n.getText('colDateStart'),
					template: { content: "{dateStart}"}
				},
				{
					name: this.i18n.getText('colDateEnd'),
					template: { content: "{dateEnd}" }
				}]
			});

			// download exported file
			oExport.saveFile().catch(function (oError) {
				MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
			}).then(function () {
				oExport.destroy();
			});
		},
		//Close Dialog
		onCloseDialog: function (e) {
			e.getSource().oParent.close();
		},
	});

	return TableController;

});