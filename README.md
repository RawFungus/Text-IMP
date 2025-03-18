# Text IMP v1.18.5

**Text IMP** is a script for importing and updating text layers in Adobe After Effects from a JSON file or directly within the project. It provides a user-friendly interface for managing text layers, exporting them to JSON, and updating them based on external data.
The code comments are in Russian, as well as the text of the buttons. However, you can easily request any LLM to translate it into your preferred language for personal use.

---

## Features
- Import text data from a JSON file.
- Export text layers from the project to a JSON file.
- Update text layers in the project based on imported JSON data.
- Filter layers to exclude those with expressions.
- Search for specific layers by name or content.
- Edit text layers directly from the interface.
- Focus on specific layers in the timeline.
- **Edit JSON files using a Python-based GUI tool.**

---

## Requirements
- **Adobe After Effects** with Legacy ExtendScript (JavaScript) support.
- Compatible with Windows and macOS.
- **Python 3.x** for the JSON editing tool.

---

## Installation
1. Download the script file `Text IMP v1.18.5.jsx`.
2. Place the file in a location accessible to Adobe After Effects.
3. Open Adobe After Effects.
4. Go to `File > Scripts > Run Script File...` and select the script.
5. (Optional) Install Python 3.x to use the JSON editing tool.

---

## How to Use

### 1. Launch the Script
Run the script from the `File > Scripts > Run Script File...` menu in Adobe After Effects. The user interface will appear.

### 2. Interface Overview
The interface is divided into several panels:
- **File Operations**: Import/export JSON files and update text layers.
- **Layer Management**: View, filter, and search text layers.
- **Text Editing**: Edit the text of selected layers.
- **Timeline Control**: Adjust the timeline position for selected layers.
- **Logging**: View logs of operations performed.

---

### 3. Import Text Data
1. Click the **"Выбрать файл"** button in the "Работа с файлами" panel.
2. Select a JSON file containing text data.
3. The file name will appear, and the data will be loaded into the layer list.

### 4. Export Text Layers
1. Click the **⬇** button in the "Работа с файлами" panel.
2. Choose a location to save the JSON file.
3. The script will export all text layers from the project to the file.

### 5. Update Text Layers
1. Import a JSON file with updated text data.
2. Click the **"Обновить текст из файла"** button.
3. The script will update the text layers in the project based on the imported data.

---

### 6. Manage Layers
- **Filter Layers**: Use the dropdown menu to show all layers or exclude those with expressions.
- **Search Layers**: Enter a search query to filter the layer list.
- **Refresh Layer List**: Click the **"Обновить список слоёв"** button to reload layers from the project.

---

### 7. Edit Layer Text
1. Select a layer from the list.
2. Edit the text in the "Редактирование текста слоя" panel.
3. Click the **"Сохранить"** button to apply changes.

---

### 8. Focus on Layers
1. Select a layer from the list.
2. Click the **"Показать слой"** button.
3. The script will navigate to the layer in the timeline and make it visible.

---

### 9. Timeline Control
- **Начало слоя**: Focus on the layer's in-point.
- **Середина слоя**: Focus on the middle of the layer.

---

### 10. Logging
- View logs of all operations in the "Логирование" panel.
- Click the **"Очистить логи"** button to clear the log.

---

### 11. Edit JSON Files with Python Tool
1. Run the Python script `IMP_JSON_GUI.py` using Python 3.x.
2. Use the GUI to open, edit, and save JSON files.
3. Features of the Python tool:
   - View compositions and layers in a tree structure.
   - Edit text content of layers.
   - Delete layers or compositions.
   - Save changes back to the JSON file.

---

## JSON File Format
The JSON file should contain an array of objects with the following structure:
```json
[
    {
        "compName": "Composition Name",
        "layerIndex": 1,
        "layerName": "Layer Name",
        "text": "New Text Content"
    }
]
```

---

## Troubleshooting
- **Error: "Слой не найден"**: Ensure the composition and layer index in the JSON file match the project.
- **Error: "Ошибка парсинга JSON"**: Verify the JSON file is correctly formatted.
- **Cannot update text**: Check if the layer's "Source Text" property is editable.

---

## Русская версия

Русскоязычная версия README доступна в файле `# RU Text IMP v1.18`. Вы можете найти её в репозитории.

---

## Author
**RawFungus**  
GitHub: [https://github.com/RawFungus](https://github.com/RawFungus)

---

## License
This script is provided "as is" without warranty of any kind. Use it at your own risk.
