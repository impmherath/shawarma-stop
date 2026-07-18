document.addEventListener("DOMContentLoaded", async () => {
    await AdminApp.ensureAuthenticated("login.html");
    AdminApp.bindLogout();
    AdminApp.setActiveNav("categories.html");

    const state = {
        categories: [],
        editingCategory: null
    };

    const elements = {
        message: document.getElementById("categoriesMessage"),
        count: document.getElementById("categoriesCount"),
        table: document.getElementById("categoriesTable"),
        addButton: document.getElementById("addCategoryButton"),
        modal: document.getElementById("categoryModal"),
        form: document.getElementById("categoryForm"),
        formMessage: document.getElementById("categoryFormMessage"),
        title: document.getElementById("categoryModalTitle"),
        saveButton: document.getElementById("saveCategoryButton"),
        id: document.getElementById("categoryId"),
        name: document.getElementById("categoryName")
    };

    bindEvents();
    await loadCategories();

    function bindEvents() {
        elements.addButton.addEventListener("click", () => openForm());
        elements.form.addEventListener("submit", saveCategory);

        document.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.addEventListener("click", () => closeForm());
        });
    }

    async function loadCategories() {
        AdminApp.setMessage(elements.message, "Loading categories...", "info");
        elements.table.innerHTML = `<tr><td colspan="4"><div class="loading-state"><div class="spinner"></div><p>Loading categories</p></div></td></tr>`;

        try {
            const response = await AdminApp.request("/categories", {
                redirectOn401: false
            });

            state.categories = response.categories || [];
            elements.count.textContent = `${state.categories.length} categor${state.categories.length === 1 ? "y" : "ies"}`;
            AdminApp.setMessage(elements.message, state.categories.length ? "Categories loaded successfully." : "No categories found.", state.categories.length ? "success" : "info");
            renderCategories();
        } catch (error) {
            console.error(error);
            AdminApp.setMessage(elements.message, error.message, "error");
            AdminApp.setEmptyState(elements.table, "Unable to load categories", "Please check the backend connection and try again.");
        }
    }

    function renderCategories() {
        if (!state.categories.length) {
            AdminApp.setEmptyState(elements.table, "No categories yet", "Create your first category to organize products.", `<button class="button btn-primary" type="button" id="emptyAddCategory">+ Add Category</button>`);
            const emptyButton = document.getElementById("emptyAddCategory");
            if (emptyButton) {
                emptyButton.addEventListener("click", () => openForm());
            }
            return;
        }

        elements.table.innerHTML = state.categories.map((category) => `
            <tr>
                <td>
                    <div class="stacked">
                        <strong>${AdminApp.escapeHtml(category.name)}</strong>
                        <span class="muted">Category ID #${AdminApp.escapeHtml(category.id)}</span>
                    </div>
                </td>
                <td><span class="chip success">${AdminApp.escapeHtml(category.product_count ?? 0)} products</span></td>
                <td>${AdminApp.formatDateTime(category.created_at || category.createdAt)}</td>
                <td>
                    <div class="table-actions">
                        <button class="button btn-outline btn-small" type="button" data-edit-category="${category.id}">Edit</button>
                        <button class="button btn-danger btn-small" type="button" data-delete-category="${category.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");

        document.querySelectorAll("[data-edit-category]").forEach((button) => {
            button.addEventListener("click", () => {
                const category = state.categories.find((item) => String(item.id) === button.dataset.editCategory);
                openForm(category);
            });
        });

        document.querySelectorAll("[data-delete-category]").forEach((button) => {
            button.addEventListener("click", async () => {
                const category = state.categories.find((item) => String(item.id) === button.dataset.deleteCategory);
                if (!category) {
                    return;
                }

                if (!window.confirm(`Delete category "${category.name}"?`)) {
                    return;
                }

                try {
                    await AdminApp.request(`/categories/${category.id}`, {
                        method: "DELETE",
                        redirectOn401: false
                    });
                    AdminApp.setMessage(elements.message, "Category deleted successfully.", "success");
                    await loadCategories();
                } catch (error) {
                    AdminApp.setMessage(elements.message, error.message, "error");
                }
            });
        });
    }

    function openForm(category = null) {
        state.editingCategory = category;
        elements.form.reset();
        elements.formMessage.hidden = true;

        if (category) {
            elements.title.textContent = "Edit Category";
            elements.saveButton.textContent = "Update Category";
            elements.id.value = category.id;
            elements.name.value = category.name || "";
        } else {
            elements.title.textContent = "Add Category";
            elements.saveButton.textContent = "Save Category";
            elements.id.value = "";
        }

        AdminApp.openModal(elements.modal);
    }

    function closeForm() {
        AdminApp.closeModal(elements.modal);
        elements.form.reset();
        elements.formMessage.hidden = true;
        state.editingCategory = null;
    }

    async function saveCategory(event) {
        event.preventDefault();

        const categoryId = elements.id.value;
        const isEdit = Boolean(categoryId);
        const name = elements.name.value.trim();

        if (!name) {
            AdminApp.setMessage(elements.formMessage, "Category name is required.", "error");
            return;
        }

        AdminApp.setMessage(elements.formMessage, isEdit ? "Updating category..." : "Saving category...", "info");
        elements.saveButton.disabled = true;

        try {
            await AdminApp.request(isEdit ? `/categories/${categoryId}` : "/categories", {
                method: isEdit ? "PUT" : "POST",
                body: { name },
                redirectOn401: false
            });

            AdminApp.setMessage(elements.formMessage, isEdit ? "Category updated successfully." : "Category created successfully.", "success");
            await loadCategories();
            closeForm();
        } catch (error) {
            AdminApp.setMessage(elements.formMessage, error.message, "error");
        } finally {
            elements.saveButton.disabled = false;
        }
    }
});