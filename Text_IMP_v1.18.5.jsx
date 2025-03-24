// Описание: Скрипт для импорта и обновления текстовых слоев из JSON-файла или внутри проекта.  
// Требования: Legacy ExtendScript (JavaScript) для Adobe After Effects  
// Автор: RawFungus  (https://github.com/RawFungus)

// Copyright (C) 2025 Evgeny G.
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.


// --- Основная функция для создания пользовательского интерфейса ---
function createUI(thisObj) {
    // --- Секция: Инициализация окна интерфейса ---
    var scriptVersion = "1.18.5"; // Обновили Ui и доработали логирование
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Text IMP v" + scriptVersion, undefined, { resizeable: true });

    // --- Секция: Элементы интерфейса ---
    setupInterface(win);

    // --- Секция: Переменные для хранения данных ---
    var selectedFile = null;
    var textData = [];
    var timelinePosition = "inPoint"; // Глобальная переменная для хранения выбранного значения
    var filterMode = "excludeExpressions"; // Глобальная переменная для хранения текущего фильтра
    var filterDropdown; // Глобальная переменная для выпадающего списка фильтров
    var logBox; // Глобальная переменная для логирования
    var textList; // Глобальная переменная для списка слоёв
    var editTextInput; // Глобальная переменная для редактирования текста
    var selectFileBtn, exportFileBtn, startBtn, showLayerBtn; // Глобальные переменные для кнопок
    var searchInput; // Глобальная переменная для поля поиска


    // --- Секция: Функции логирования ---
    var maxLogEntries = 6; // Максимальное количество записей в логе

    function log(message) {
        var logLines = logBox.text.split("\n");
        if (logLines.length >= maxLogEntries) {
            logLines.shift(); // Удаляем самую старую запись
        }
        logLines.push(message); // Добавляем новую запись
        logBox.text = logLines.join("\n");
        win.layout.layout(true);
    }

    function clearLog() {
        logBox.text = ""; // Очищаем содержимое логов
    }

    // --- Приветственное сообщение ---
    log("============ Text IMP v" + scriptVersion + " ============");
    log("Автор: RawFungus (https://github.com/RawFungus)");
    

    // --- Секция: Функции для работы с текстовыми слоями ---

    function findLayerByCompAndIndex(compName, layerIndex) {
        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);
            if (item instanceof CompItem && item.name === compName) {
                if (layerIndex > 0 && layerIndex <= item.numLayers) {
                    return { comp: item, layer: item.layer(layerIndex) };
                }
            }
        }
        return null;
    }

    // --- Секция: Функции для фокусировки на слое ---
    function openCompInProject(comp) {
        for (var i = 1; i <= app.project.numItems; i++) {
            if (app.project.item(i) === comp) {
                app.project.item(i).selected = true;
                app.executeCommand(2004); // "Reveal Composition in Project"
                return;
            }
        }
    }


    function focusOnLayer(layerInfo) {
        if (!layerInfo) {
            alert("Слой не найден.");
            return;
        }

        var comp = layerInfo.comp;
        var layer = layerInfo.layer;

        app.beginUndoGroup("Find and Focus Layer");

        // Открываем pre-comp через Project Panel
        openCompInProject(comp);

        // Делаем pre-comp активной
        comp.openInViewer();

        // Делаем слой видимым
        layer.shy = false;

        // ✅ ОБХОД readOnly: Выделяем слой через .selected = true
        for (var i = 1; i <= comp.numLayers; i++) {
            comp.layer(i).selected = false;
        }
        layer.selected = true;

        // Центрируем таймлайн в зависимости от выбранного режима
        if (timelinePosition === "inPoint") {
            comp.time = layer.inPoint; // В начале слоя
        } else if (timelinePosition === "middle") {
            comp.time = (layer.inPoint + layer.outPoint) / 2; // В середине слоя
        }

        // Активируем окно просмотра композиции
        var viewer = app.activeViewer;
        if (viewer) {
            viewer.setActive();
            viewer.views[0].options.zoom = 0.4; // 40% масштаб
        }

        log("✅ Выбран слой '" + layer.name + "' в композиции: " + comp.name);
        app.endUndoGroup();
    }


    function findTextLayers() {
        var layers = [];

        for (var i = 1; i <= app.project.numItems; i++) {
            var item;
            try {
                item = app.project.item(i);
            } catch (e) {
                log("⚠️ Ошибка доступа к элементу проекта " + i + ": " + e.message, "error");
                continue;
            }

            if (item instanceof CompItem) {
                for (var j = 1; j <= item.numLayers; j++) {
                    var layer;
                    try {
                        layer = item.layer(j);
                    } catch (e) {
                        log("⚠️ Ошибка доступа к слою " + j + " в композиции " + item.name + ": " + e.message, "error");
                        continue;
                    }

                    try {
                        if (layer.property("Source Text") !== null) {
                            var textValue = layer.property("Source Text").value;

                            layers.push({
                                compName: item.name,
                                layerIndex: j,
                                layerName: layer.name,
                                text: textValue && typeof textValue.text === "string" ? textValue.text : "(пустой текст)"
                            });
                        }
                    } catch (e) {
                        log("⚠️ Ошибка при обработке слоя '" + layer.name + "' в " + item.name + ": " + e.message, "error");
                    }
                }
            }
        }
        return layers;
    }

    // --- Секция: Экспорт данных в JSON-файл ---
    function exportToJsonFile() {
        try {
            var layers = findTextLayers();

            if (!layers || layers.length === 0) {
                alert("Нет текстовых слоёв для экспорта.");
                return;
            }

            var saveFile = File.saveDialog("Сохранить JSON-файл", "*.json");
            if (!saveFile) return;

            if (!saveFile.open("w")) {
                alert("❌ Ошибка сохранения файла. Возможно, у вас нет прав на запись или файл уже открыт.");
                return;
            }

            saveFile.encoding = "UTF-8";
            saveFile.write(JSON.stringify(layers, null, 4));
            saveFile.close();

            log("✅ Файл успешно сохранён: " + saveFile.fsName, "success");
        } catch (e) {
            alert("❌ Ошибка в exportToJsonFile: " + e.message);
        }
    }

    exportFileBtn.onClick = exportToJsonFile;

    // --- Секция: Импорт данных из JSON-файла ---
    selectFileBtn.onClick = function () {
        selectedFile = File.openDialog("Выберите JSON-файл", "*.json");

        if (selectedFile) {
            fileNameText.text = decodeURI(selectedFile.name);
            loadJsonFile(selectedFile);
        } else {
            fileNameText.text = "Файл не выбран";
        }
    };

    function loadJsonFile(file) {
        if (file.open("r")) {
            var data = file.read();
            file.close();
            parseJsonData(data);
        } else {
            log("❌ Ошибка: Не удалось открыть файл.", "error");
        }
    }

    // --- Секция: Форматирование строки для отображения в списке ---
    function formatLayerForList(layer) {
        return layer.layerName + " [" + layer.layerIndex + "] = " + layer.text;
    }

    // --- Секция: Фильтрация слоёв для отображения ---
    function shouldDisplayLayer(layer) {
        if (filterMode === "excludeExpressions") {
            var layerInfo = findLayerByCompAndIndex(layer.compName, layer.layerIndex);
            if (layerInfo) {
                var textProp = layerInfo.layer.property("Source Text");
                return !textProp.expressionEnabled; // Исключаем слои с включёнными выражениями
            }
        }
        return true; // Отображаем все слои в режиме "Отображать всё"
    }

    // --- Секция: Связывание данных с элементами списка ---
    function bindTextList() {
        textList.removeAll(); // Очищаем список
        for (var i = 0; i < textData.length; i++) {
            var entry = textData[i];
            if (shouldDisplayLayer(entry)) {
                var listItem = textList.add("item", formatLayerForList(entry)); // Добавляем визуальный элемент
                listItem.data = entry; // Привязываем данные слоя к элементу списка
            }
        }
    }

    // --- Секция: Импорт данных из JSON-файла ---
    function parseJsonData(data) {
        try {
            textData = JSON.parse(data); // Загружаем данные в массив
            bindTextList(); // Обновляем визуализацию списка
            log("✅ Загружено записей: " + textData.length, "success");
        } catch (e) {
            log("❌ Ошибка парсинга JSON: " + e.message, "error");
        }
    }

    // --- Секция: Обновление списка слоёв из проекта ---
    function updateLayerListFromProject() {
        log("🔄 Обновление списка текстовых слоёв из проекта...", "info");

        try {
            textData = findTextLayers(); // Получаем список текстовых слоёв
            bindTextList(); // Обновляем визуализацию списка
            log("✅ Список текстовых слоёв обновлён. Найдено: " + textData.length, "success");
        } catch (e) {
            log("❌ Ошибка при обновлении списка слоёв: " + e.message, "error");
        }
    }

    // --- Секция: Обновление текста в слоях ---
    startBtn.onClick = function () {
        if (!selectedFile) {
            log("❌ Ошибка: Пожалуйста, выберите файл перед запуском.", "error");
            return;
        }

        log("🔄 Начинается обновление текстовых слоёв...", "info");

        var successCount = 0;
        var skippedCount = 0;
        var errorCount = 0;

        app.beginUndoGroup("Обновление текстов");

        try {
            for (var i = 0; i < textData.length; i++) {
                var entry = textData[i];

                var layerInfo = findLayerByCompAndIndex(entry.compName, entry.layerIndex);
                if (!layerInfo) {
                    log("⚠️ Слой не найден: " + entry.layerName + " в композиции " + entry.compName, "error");
                    errorCount++;
                    continue;
                }

                try {
                    var textProp = layerInfo.layer.property("Source Text");
                    if (!textProp || !textProp.canSetExpression) {
                        log("⚠️ Нельзя изменить текст слоя: " + entry.layerName, "error");
                        skippedCount++;
                        continue;
                    }

                    var textDocument = textProp.value;
                    if (textDocument.text !== entry.text) {
                        textDocument.text = entry.text;
                        textProp.setValue(textDocument);
                        successCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (e) {
                    log("❌ Ошибка обновления текста слоя '" + entry.layerName + "': " + e.message, "error");
                    errorCount++;
                }
            }
        } catch (e) {
            log("❌ Общая ошибка во время обновления: " + e.message, "error");
        } finally {
            app.endUndoGroup();
        }

        log("\n✅ Итог: Обновлено: " + successCount + ", Пропущено: " + skippedCount + ", Ошибок: " + errorCount, "success");
    };

    // --- Секция: Показ слоя в композиции ---
    showLayerBtn.onClick = function () {
        var selected = textList.selection;
        if (!selected) {
            log("⚠️ Выберите слой из списка.", "info");
            return;
        }

        var entry = selected.data; // Получаем данные слоя из привязки
        if (!entry) {
            log("⚠️ Ошибка: Данные слоя не найдены.", "error");
            return;
        }

        // Находим слой по имени композиции и индексу
        var layerInfo = findLayerByCompAndIndex(entry.compName, entry.layerIndex);
        if (layerInfo) {
            log("✅ Слой найден. Переход к слою...", "info");
            focusOnLayer(layerInfo);
        } else {
            log("⚠️ Слой не найден: " + entry.layerName + " [" + entry.layerIndex + "] в композиции " + entry.compName, "error");
        }
    };

    // --- Секция: Функция для фильтрации списка ---
    function filterTextList(query) {
        query = query.toLowerCase(); // Приводим запрос к нижнему регистру для нестрогого поиска
        textList.removeAll(); // Очищаем текущий список

        for (var i = 0; i < textData.length; i++) {
            var entry = textData[i];
            var listItemText = formatLayerForList(entry);

            if (listItemText.toLowerCase().indexOf(query) !== -1) {
                var listItem = textList.add("item", listItemText); // Добавляем элемент в список
                listItem.data = entry; // Привязываем данные слоя к элементу списка
            }
        }
    }

    // --- Секция: Обновление текста выбранного слоя ---
    function updateSelectedLayerText() {
        var selected = textList.selection;
        if (!selected) {
            log("⚠️ Выберите слой из списка для изменения текста.", "info");
            return;
        }

        var entry = selected.data; // Получаем данные слоя из привязки
        if (!entry) {
            log("⚠️ Ошибка: Данные слоя не найдены.", "error");
            return;
        }

        // Обновляем текст слоя
        try {
            var layerInfo = findLayerByCompAndIndex(entry.compName, entry.layerIndex);
            if (!layerInfo) {
                log("⚠️ Слой не найден в композиции: " + entry.compName, "error");
                return;
            }

            var textProp = layerInfo.layer.property("Source Text");
            var textDocument = textProp.value;
            var newText = editTextInput.text; // Получаем текст из многострочного поля ввода

            if (textDocument.text !== newText) {
                textDocument.text = newText;
                textProp.setValue(textDocument);

                // Обновляем данные и визуализацию
                entry.text = newText;
                selected.text = formatLayerForList(entry);

                log("✅ Текст слоя '" + entry.layerName + "' обновлён.", "success");
            } else {
                log("ℹ️ Текст слоя уже актуален.", "info");
            }
        } catch (e) {
            log("❌ Ошибка обновления текста слоя: " + e.message, "error");
        }
    }

    // --- Секция: Обновление поля текста при выборе слоя ---
    textList.onChange = function () {
        var selected = textList.selection;
        if (!selected) {
            editTextInput.text = ""; // Очищаем поле, если ничего не выбрано
            return;
        }

        var entry = selected.data; // Получаем данные слоя из привязки
        if (entry) {
            editTextInput.text = entry.text; // Отображаем текущий текст слоя
        } else {
            editTextInput.text = ""; // Очищаем поле, если данные не найдены
        }
    };

    // --- Фильтрация слоёв ---
    filterDropdown.onChange = function () {
        filterMode = filterDropdown.selection.index === 1 ? "excludeExpressions" : "showAll";
        bindTextList(); // Refresh the list after changing the filter
    };

    function shouldDisplayLayer(layer) {
        if (filterMode === "excludeExpressions") {
            var layerInfo = findLayerByCompAndIndex(layer.compName, layer.layerIndex);
            if (layerInfo) {
                var textProp = layerInfo.layer.property("Source Text");
                return textProp && !textProp.expressionEnabled; // Exclude layers with expressions
            }
        }
        return true; // Show all layers in "Show All" mode
    }

    // --- Поиск слоёв ---
    searchInput.onChanging = function () {
        filterTextList(searchInput.text); // Filter the list on every text change
    };

    function filterTextList(query) {
        query = query.toLowerCase(); // Case-insensitive search
        textList.removeAll(); // Clear the current list

        for (var i = 0; i < textData.length; i++) {
            var entry = textData[i];
            var listItemText = formatLayerForList(entry);

            if (listItemText.toLowerCase().indexOf(query) !== -1) {
                var listItem = textList.add("item", listItemText); // Add matching item to the list
                listItem.data = entry; // Attach layer data to the list item
            }
        }
    }
    // --- Обновление текста из файла ---
    function parseJsonData(data) {
        try {
            textData = JSON.parse(data); // Загружаем данные в массив
            bindTextList(); // Обновляем визуализацию списка
            log("✅ Загружено записей: " + textData.length, "успех");
        } catch (e) {
            log("❌ Ошибка парсинга JSON: " + e.message, "ошибка");
        }
    }

    // --- Поиск текстовых слоёв ---
    function findTextLayers() {
        var layers = [];

        for (var i = 1; i <= app.project.numItems; i++) {
            var item;
            try {
                item = app.project.item(i);
            } catch (e) {
                log("⚠️ Ошибка доступа к элементу проекта " + i + ": " + e.message, "ошибка");
                continue;
            }

            if (item instanceof CompItem) {
                for (var j = 1; j <= item.numLayers; j++) {
                    var layer;
                    try {
                        layer = item.layer(j);
                    } catch (e) {
                        log("⚠️ Ошибка доступа к слою " + j + " в композиции " + item.name + ": " + e.message, "ошибка");
                        continue;
                    }

                    try {
                        if (layer.property("Source Text") !== null) {
                            var textValue = layer.property("Source Text").value;

                            layers.push({
                                compName: item.name,
                                layerIndex: j,
                                layerName: layer.name,
                                text: textValue && typeof textValue.text === "string" ? textValue.text : "(пустой текст)"
                            });
                        }
                    } catch (e) {
                        log("⚠️ Ошибка обработки слоя '" + layer.name + "' в " + item.name + ": " + e.message, "ошибка");
                    }
                }
            }
        }
        return layers;
    }

    // --- Завершение и отображение интерфейса ---
    win.center();
    win.show();

    

    // --- Секция: Функция для настройки интерфейса ---
    function setupInterface(win) {
        // --- Панель для работы с файлами ---
        var filePanel = win.add("panel", undefined, "Работа с файлами");
        filePanel.orientation = "column";
        filePanel.alignChildren = ["fill", "center"];
        filePanel.margins = 10;

        var fileGroup = filePanel.add("group");
        fileGroup.orientation = "row";
        fileGroup.alignChildren = ["fill", "center"];
        fileGroup.spacing = 10;

        selectFileBtn = fileGroup.add("button", undefined, "Выбрать файл");
        selectFileBtn.helpTip = "Выберите JSON-файл для импорта данных";

        fileNameText = fileGroup.add("statictext", undefined, "Файл не выбран", { truncate: "middle" });
        fileNameText.alignment = ["fill", "center"];
        fileNameText.minimumSize.width = 150;

        exportFileBtn = fileGroup.add("button", undefined, "⬇");
        exportFileBtn.size = [25, 25];
        exportFileBtn.helpTip = "Экспортируйте текстовые слои проекта в JSON-файл";

        // Перенос кнопки "Обновить текст из файла" в панель "Работа с файлами"
        startBtn = filePanel.add("button", undefined, "Обновить текст из файла");
        startBtn.helpTip = "Обновите текстовые слои на основе данных из выбранного JSON-файла";

        // --- Панель для управления списком слоёв ---
        var layerPanel = win.add("panel", undefined, "Управление слоями");
        layerPanel.orientation = "column";
        layerPanel.alignChildren = ["fill", "center"];
        layerPanel.margins = 10;

        var filterGroup = layerPanel.add("group");
        filterGroup.orientation = "row";
        filterGroup.alignChildren = ["left", "center"];
        filterGroup.spacing = 10;

        filterGroup.add("statictext", undefined, "Фильтр:");
        filterDropdown = filterGroup.add("dropdownlist", undefined, ["Отображать всё", "Исключить слои с выражениями"]);
        filterDropdown.selection = 1; // По умолчанию выбран "Исключить слои с выражениями"
        filterDropdown.helpTip = "Выберите, какие слои отображать в списке";

        filterDropdown.onChange = function () {
            filterMode = filterDropdown.selection.index === 1 ? "excludeExpressions" : "showAll";
            bindTextList(); // Refresh the list after changing the filter
        };

        var searchGroup = layerPanel.add("group");
        searchGroup.orientation = "row";
        searchGroup.alignChildren = ["left", "center"];
        searchGroup.spacing = 10;

        searchGroup.add("statictext", undefined, "Поиск:");
        searchInput = searchGroup.add("edittext", undefined, ""); // Инициализируем глобальную переменную
        searchInput.preferredSize = [250, 25];
        searchInput.helpTip = "Введите текст для поиска слоёв";


        textList = layerPanel.add("listbox", undefined, [], { multiselect: false });
        textList.alignment = ["fill", "fill"]; // Пропорциональный размер
        textList.minimumSize.height = 150;
        textList.minimumSize.width = 300;


        var btnGroup = layerPanel.add("group");
        btnGroup.orientation = "row"; // Выравнивание кнопок в один ряд
        btnGroup.alignChildren = ["fill", "center"];
        btnGroup.spacing = 10;

        showLayerBtn = btnGroup.add("button", undefined, "Показать слой");
        showLayerBtn.helpTip = "Показать выбранный слой в композиции";

        var updateLayersBtn = btnGroup.add("button", undefined, "Обновить список слоёв");
        updateLayersBtn.helpTip = "Обновите список текстовых слоёв из проекта";
        updateLayersBtn.onClick = updateLayerListFromProject;

        // --- Панель для редактирования текста слоя ---
        var editPanel = win.add("panel", undefined, "Редактирование текста слоя");
        editPanel.orientation = "column";
        editPanel.alignChildren = ["fill", "top"];
        editPanel.margins = 10;

        var editGroup = editPanel.add("group");
        editGroup.orientation = "column";
        editGroup.alignChildren = ["fill", "top"];
        editGroup.spacing = 10;

        editTextInput = editGroup.add("edittext", undefined, "", { multiline: true, scrolling: true });
        editTextInput.alignment = ["fill", "fill"]; // Пропорциональный размер
        editTextInput.minimumSize.height = 100;
        editTextInput.minimumSize.width = 300;
        editTextInput.helpTip = "Введите новый текст для выбранного слоя";

        var saveTextBtn = editGroup.add("button", undefined, "Сохранить");
        saveTextBtn.alignment = ["fill", "center"];
        saveTextBtn.onClick = updateSelectedLayerText;
        saveTextBtn.helpTip = "Сохраните изменения текста для выбранного слоя";

        // --- Панель для управления таймлайном ---
        var timelinePanel = win.add("panel", undefined, "Управление таймлайном");
        timelinePanel.orientation = "row";
        timelinePanel.alignChildren = ["left", "center"];
        timelinePanel.margins = 10;

        timelinePanel.add("statictext", undefined, "Позиция таймлайна:");
        var inPointRadio = timelinePanel.add("radiobutton", undefined, "Начало слоя");
        inPointRadio.value = true; // По умолчанию — начало слоя
        inPointRadio.helpTip = "Перейти к началу слоя на таймлайне";

        var middleRadio = timelinePanel.add("radiobutton", undefined, "Середина слоя");
        middleRadio.helpTip = "Перейти к середине слоя на таймлайне";

        inPointRadio.onClick = function () {
            timelinePosition = "inPoint";
        };
        middleRadio.onClick = function () {
            timelinePosition = "middle";
        };

        // --- Панель для логирования ---
        var logPanel = win.add("panel", undefined, "Логирование");
        logPanel.orientation = "column";
        logPanel.alignChildren = ["fill", "top"];
        logPanel.margins = 10;

        logBox = logPanel.add("edittext", undefined, "", { multiline: true, scrolling: true });
        logBox.alignment = ["fill", "fill"]; // Пропорциональный размер
        logBox.minimumSize.height = 150;
        logBox.minimumSize.width = 300;
        logBox.helpTip = "Просмотрите логи выполнения операций";

        var logBtnGroup = logPanel.add("group");
        logBtnGroup.orientation = "row";
        logBtnGroup.alignChildren = ["fill", "center"];
        logBtnGroup.spacing = 10;

        var clearLogBtn = logBtnGroup.add("button", undefined, "Очистить логи");
        clearLogBtn.alignment = ["fill", "center"];
        clearLogBtn.onClick = clearLog;
        clearLogBtn.helpTip = "Очистите содержимое логов";

        // --- Индикатор загрузки ---
        loadingIndicator = win.add("statictext", undefined, "Загрузка...");
        loadingIndicator.visible = false; // Скрываем индикатор по умолчанию
        loadingIndicator.helpTip = "Индикатор выполнения операций";
    }
}

// --- Запуск пользовательского интерфейса ---
createUI(this);
