document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const taskList = document.getElementById('taskList');
    const categoryFilter = document.getElementById('categoryFilter');
    const darkModeToggle = document.getElementById('darkModeToggle');

    const tasks = new Map();
    const categories = new Set();

    async function fetchInitialTasks() {
        try {
            const response = await fetch('https://my.api.mockaroo.com/users.json?key=03ff0e10');
            const data = await response.json();
            console.log("Fetched data:", data);

            for (const task of data) {
                const taskId = task.id.toString();
                if (!tasks.has(taskId)) {
                    const newTask = {
                        id: taskId,
                        name: await translateText(task.name || "Untitled Task"),
                        category: await translateText(task.category || 'General'),
                        priority: task.priority || 'medium',
                        dueDate: task.dueDate || new Date().toISOString().split('T')[0],
                        completed: task.completed ?? false
                    };

                    tasks.set(taskId, newTask);
                    categories.add(newTask.category);
                    renderTask(newTask);
                }
            }
            saveTasks();
            updateCategoryFilter();
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }

    async function translateText(text) {
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|en`);
            const result = await response.json();
            return result.responseData.translatedText || text;
        } catch (error) {
            console.error("Translation error:", error);
            return text;
        }
    }

    function loadTasks() {
        const savedTasks = JSON.parse(localStorage.getItem('tasks')) || [];
        savedTasks.forEach(task => {
            tasks.set(task.id, task);
            categories.add(task.category);
            renderTask(task);
        });
        updateCategoryFilter();
    }

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(Array.from(tasks.values())));
    }

    function updateCategoryFilter() {
        categoryFilter.innerHTML = '<option value="all">All Categories</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    function generateTaskId() {
        return Date.now().toString();
    }

    function addTask(name, category, priority, dueDate) {
        const taskId = generateTaskId();
        const task = {
            id: taskId,
            name,
            category,
            priority,
            dueDate,
            completed: false
        };

        tasks.set(taskId, task);
        categories.add(category);
        renderTask(task);
        saveTasks();
        updateCategoryFilter();
    }

    function renderTask(task) {
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item');
        taskItem.setAttribute('data-task-id', task.id);

        if (task.completed) {
            taskItem.classList.add('completed');
        }

        taskItem.innerHTML = `
            <span>${task.name} - ${task.category} - ${task.priority} - ${task.dueDate}</span>
            <div class="actions">
                <button data-action="edit">Edit</button>
                <button data-action="delete">Delete</button>
                <button data-action="toggleComplete">
                    ${task.completed ? 'Undo' : 'Complete'}
                </button>
            </div>
        `;

        taskList.appendChild(taskItem);
    }

    taskList.addEventListener('click', (e) => {
        const target = e.target;
        const taskId = target.closest('.task-item').getAttribute('data-task-id');

        if (target.getAttribute('data-action') === 'delete') {
            deleteTask(taskId);
        } else if (target.getAttribute('data-action') === 'toggleComplete') {
            toggleComplete(taskId);
        } else if (target.getAttribute('data-action') === 'edit') {
            editTask(taskId);
        }
    });

    function deleteTask(taskId) {
        if (tasks.has(taskId)) {
            tasks.delete(taskId);
            document.querySelector(`[data-task-id="${taskId}"]`).remove();
            saveTasks();
        }
    }

    function toggleComplete(taskId) {
        const task = tasks.get(taskId);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderUpdatedTasks();
        }
    }

    function editTask(taskId) {
        const task = tasks.get(taskId);
        if (task) {
            const newName = prompt("Edit task name:", task.name);
            const newCategory = prompt("Edit category:", task.category);
            const newPriority = prompt("Edit priority (High, Medium, Low):", task.priority);
            const newDueDate = prompt("Edit due date (YYYY-MM-DD):", task.dueDate);

            if (newName && newCategory && newPriority && newDueDate) {
                task.name = newName;
                task.category = newCategory;
                task.priority = newPriority;
                task.dueDate = newDueDate;
                saveTasks();
                renderUpdatedTasks();
            }
        }
    }

    function renderUpdatedTasks() {
        taskList.innerHTML = "";
        tasks.forEach(task => renderTask(task));
    }

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();  // Prevent default form submission

        const taskName = document.getElementById('taskName').value.trim();
        const taskCategory = document.getElementById('newCategory').value.trim();
        const taskPriority = document.getElementById('taskPriority').value;
        const taskDueDate = document.getElementById('taskDueDate').value;

        if (taskName && taskCategory && taskPriority && taskDueDate) {
            addTask(taskName, taskCategory, taskPriority, taskDueDate);
            taskForm.reset();  // Clear form after submission
        } else {
            alert('Please fill out all fields');
        }
    });

    document.getElementById('categoryFilter').addEventListener('change', filterTasks);
    document.getElementById('filterPriority').addEventListener('change', filterTasks);
    document.getElementById('filterCompleted').addEventListener('change', filterTasks);

    function filterTasks() {
        const category = document.getElementById('categoryFilter').value;
        const priority = document.getElementById('filterPriority').value;
        const completed = document.getElementById('filterCompleted').value;

        const filteredTasks = Array.from(tasks.values()).filter(task => {
            return (category === 'all' || task.category === category) &&
                   (priority === 'all' || task.priority === priority) &&
                   (completed === 'all' || (completed === 'completed' && task.completed) || (completed === 'incomplete' && !task.completed));
        });

        taskList.innerHTML = "";
        filteredTasks.forEach(task => renderTask(task));
    }

    loadTasks();
    fetchInitialTasks();

    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);

        darkModeToggle.textContent = isDarkMode ? 'Light Mode' : 'Dark Mode';
    });

    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = 'Light Mode';
    } else {
        darkModeToggle.textContent = 'Dark Mode';
    }
});