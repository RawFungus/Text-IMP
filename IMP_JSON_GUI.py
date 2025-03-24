# Автор: RawFungus  (https://github.com/RawFungus)

# Copyright (C) 2025 Evgeny G.
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.

import tkinter as tk
from tkinter import ttk, filedialog
import json
from tkinter.font import Font

VERSION = "1.0.0"  # Version number

class JsonEditorApp:
    def __init__(self, root):
        self.root = root
        self.root.title(f"Text IMP Assistant v{VERSION}")
        self.root.geometry("1000x900")  # Default window size
        self.json_data = []
        self.current_file = None

        # Load Inter font
        self.inter_font = Font(family="Inter", size=10)
        self.root.option_add("*Font", self.inter_font)

        # UI Layout
        self.setup_ui()

    def setup_ui(self):
        # Frame for JSON file operations
        file_frame = tk.Frame(self.root)
        file_frame.pack(fill=tk.X, padx=5, pady=5)

        tk.Button(file_frame, text="📂 Выбрать JSON файл", command=self.load_json_file).pack(side=tk.LEFT, padx=5)
        tk.Button(file_frame, text="💾 Обновить JSON файл", command=self.save_json_file).pack(side=tk.LEFT, padx=5)

        # Treeview for compositions and layers
        self.tree = ttk.Treeview(self.root, columns=("Text"), show="tree")
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.tree.bind("<<TreeviewSelect>>", self.on_tree_select)

        # Scrollbar for treeview
        tree_scroll = ttk.Scrollbar(self.root, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=tree_scroll.set)
        tree_scroll.pack(side=tk.LEFT, fill=tk.Y)

        # Frame for text editing
        edit_frame = tk.Frame(self.root)
        edit_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Log box for messages
        tk.Label(edit_frame, text="Лог операций:").pack(anchor=tk.W, padx=5, pady=5)
        self.log_text = tk.Text(edit_frame, wrap=tk.WORD, height=5, state=tk.DISABLED)
        self.log_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        log_scroll = ttk.Scrollbar(edit_frame, orient="vertical", command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=log_scroll.set)
        log_scroll.pack(side=tk.RIGHT, fill=tk.Y)

        # Separator
        ttk.Separator(edit_frame, orient="horizontal").pack(fill=tk.X, padx=5, pady=5)

        tk.Label(edit_frame, text="Текст слоя:").pack(anchor=tk.W, padx=5, pady=5)
        self.text_editor = tk.Text(edit_frame, wrap=tk.WORD, height=10)
        self.text_editor.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Buttons for editing
        button_frame = tk.Frame(edit_frame)
        button_frame.pack(fill=tk.X, padx=5, pady=5)

        tk.Button(button_frame, text="💾 Сохранить изменения", command=self.save_layer_text).pack(side=tk.LEFT, padx=5)
        tk.Button(button_frame, text="❌ Удалить слой/композицию", command=self.delete_selected).pack(side=tk.LEFT, padx=5)

    def set_log_message(self, message, level="info"):
        """Set a log message in the log box with color indication and emoji."""
        colors = {"info": "blue", "success": "green", "warning": "orange", "error": "red", "delete": "black", "save": "green"}
        emojis = {"info": "ℹ️", "success": "✅", "warning": "⚠️", "error": "❌", "delete": "🗑️", "save": "💾"}
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, f"{emojis.get(level, '')} {message}\n", level)
        self.log_text.tag_config(level, foreground=colors.get(level, "black"))
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

    def load_json_file(self):
        file_path = filedialog.askopenfilename(filetypes=[("JSON Files", "*.json")])
        if not file_path:
            self.set_log_message("Загрузка файла отменена.", level="warning")
            return

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                self.json_data = json.load(file)
            self.current_file = file_path
            self.populate_tree()
            self.set_log_message(f"Файл {file_path} успешно загружен.", level="success")
        except Exception as e:
            self.set_log_message(f"Ошибка загрузки файла: {e}", level="error")

    def save_json_file(self):
        if not self.current_file:
            self.set_log_message("Сначала выберите JSON файл.", level="warning")
            return

        try:
            with open(self.current_file, "w", encoding="utf-8") as file:
                json.dump(self.json_data, file, indent=4, ensure_ascii=False)
            self.set_log_message("Файл успешно сохранён.", level="save")
        except Exception as e:
            self.set_log_message(f"Ошибка сохранения файла: {e}", level="error")

    def populate_tree(self):
        self.tree.delete(*self.tree.get_children())
        compositions = {}
        for item in self.json_data:
            comp_name = item["compName"]
            if comp_name not in compositions:
                compositions[comp_name] = []
            compositions[comp_name].append(item)

        for comp_name, layers in compositions.items():
            comp_id = self.tree.insert("", "end", text=comp_name, open=False)
            for layer in layers:
                                self.tree.insert(comp_id, "end", text=layer["layerName"], values=(layer["text"],), tags=(comp_name,))

    def on_tree_select(self, event):
        selected_item = self.tree.selection()
        if not selected_item:
            return

        parent = self.tree.parent(selected_item[0])
        if parent:  # Layer selected
            comp_name = self.tree.item(parent, "text")
            layer_name = self.tree.item(selected_item[0], "text")
            for item in self.json_data:
                if item["compName"] == comp_name and item["layerName"] == layer_name:
                    self.text_editor.delete(1.0, tk.END)
                    self.text_editor.insert(tk.END, item["text"])
                    break
        else:  # Composition selected
            self.text_editor.delete(1.0, tk.END)

    def save_layer_text(self):
        selected_item = self.tree.selection()
        if not selected_item:
            self.set_log_message("Сначала выберите слой.", level="warning")
            return

        parent = self.tree.parent(selected_item[0])
        if not parent:
            self.set_log_message("Выберите слой, а не композицию.", level="warning")
            return

        comp_name = self.tree.item(parent, "text")
        layer_name = self.tree.item(selected_item[0], "text")
        new_text = self.text_editor.get(1.0, tk.END).rstrip("\n")  # Preserve newlines and special characters

        for item in self.json_data:
            if item["compName"] == comp_name and item["layerName"] == layer_name:
                item["text"] = new_text
                self.tree.item(selected_item[0], values=(new_text,))
                self.set_log_message("Текст слоя обновлён.", level="success")
                break

    def delete_selected(self):
        selected_item = self.tree.selection()
        if not selected_item:
            self.set_log_message("Сначала выберите элемент для удаления.", level="warning")
            return

        parent = self.tree.parent(selected_item[0])
        if parent:  # Layer selected
            comp_name = self.tree.item(parent, "text")
            layer_name = self.tree.item(selected_item[0], "text")
            self.json_data = [item for item in self.json_data if not (item["compName"] == comp_name and item["layerName"] == layer_name)]
            self.tree.delete(selected_item[0])
            self.set_log_message("Слой удалён.", level="delete")
        else:  # Composition selected
            comp_name = self.tree.item(selected_item[0], "text")
            self.json_data = [item for item in self.json_data if item["compName"] != comp_name]
            self.tree.delete(selected_item[0])
            self.set_log_message("Композиция удалена.", level="delete")


if __name__ == "__main__":
    root = tk.Tk()
    app = JsonEditorApp(root)
    root.mainloop()
