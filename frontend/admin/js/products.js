document.addEventListener("DOMContentLoaded", async () => {
    await AdminApp.ensureAuthenticated("login.html");
    AdminApp.bindLogout();
    AdminApp.setActiveNav("products.html");

    const state = {
        categories: [],
        products: [],
        editingProduct: null
    };

    const elements = {
        message: document.getElementById("productsMessage"),
        count: document.getElementById("productsCount"),
        table: document.getElementById("productsTable"),
        filters: document.getElementById("productFilters"),
        search: document.getElementById("productSearch"),
        availabilityFilter: document.getElementById("availabilityFilter"),
        resetButton: document.getElementById("resetProducts"),
        addButton: document.getElementById("addProductButton"),
        modal: document.getElementById("productModal"),
        form: document.getElementById("productForm"),
        formMessage: document.getElementById("productFormMessage"),
        title: document.getElementById("productModalTitle"),
        saveButton: document.getElementById("saveProductButton"),
        id: document.getElementById("productId"),
        name: document.getElementById("productName"),
        description: document.getElementById("productDescription"),
        price: document.getElementById("productPrice"),
        category: document.getElementById("productCategory"),
        availability: document.getElementById("productAvailability"),
        image: document.getElementById("productImage"),
        preview: document.getElementById("productImagePreview")
    };

    bindEvents();
    await loadCategories();
    await loadProducts();

    function bindEvents() {
        elements.filters.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loadProducts();
        });

        elements.resetButton.addEventListener("click", async () => {
            elements.search.value = "";
            elements.availabilityFilter.value = "";
            await loadProducts();
        });

        elements.addButton.addEventListener("click", () => openForm());

        elements.form.addEventListener("submit", saveProduct);

        document.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.addEventListener("click", () => closeForm());
        });

        elements.image.addEventListener("change", () => {
            const file = elements.image.files[0];
            if (!file) {
                elements.preview.hidden = true;
                elements.preview.removeAttribute("src");
                return;
            }

            elements.preview.src = URL.createObjectURL(file);
            elements.preview.hidden = false;
        });
    }

    async function loadCategories() {
        const response = await AdminApp.request("/categories", {
            redirectOn401: false
        });

        state.categories = response.categories || [];
        renderCategoryOptions();
    }

    function renderCategoryOptions() {
        const placeholder = `<option value="">Select category</option>`;
        const options = state.categories.map((category) => `<option value="${category.id}">${AdminApp.escapeHtml(category.name)}</option>`).join("");
        elements.category.innerHTML = placeholder + options;
    }

    async function loadProducts() {
        AdminApp.setMessage(elements.message, "Loading products...", "info");
        elements.table.innerHTML = `<tr><td colspan="7"><div class="loading-state"><div class="spinner"></div><p>Loading products</p></div></td></tr>`;

        const params = new URLSearchParams();
        if (elements.search.value.trim()) {
            params.set("search", elements.search.value.trim());
        }
        if (elements.availabilityFilter.value) {
            params.set("availability", elements.availabilityFilter.value);
        }

        try {
            const response = await AdminApp.request(`/products${params.toString() ? `?${params.toString()}` : ""}`, {
                redirectOn401: false
            });

            state.products = response.products || [];
            elements.count.textContent = `${state.products.length} product${state.products.length === 1 ? "" : "s"}`;
            AdminApp.setMessage(elements.message, state.products.length ? "Products loaded successfully." : "No products found for the current filters.", state.products.length ? "success" : "info");
            renderProducts();
        } catch (error) {
            console.error(error);
            AdminApp.setMessage(elements.message, error.message, "error");
            elements.table.innerHTML = "";
            AdminApp.setEmptyState(elements.table, "Unable to load products", "Please check the backend connection and try again.");
        }
    }

    function renderProducts() {
        if (!state.products.length) {
            AdminApp.setEmptyState(elements.table, "No products found", "Add your first product or adjust the search filters.", `<button class="button btn-primary" type="button" id="emptyAddProduct">+ Add Product</button>`);
            const emptyButton = document.getElementById("emptyAddProduct");
            if (emptyButton) {
                emptyButton.addEventListener("click", () => openForm());
            }
            return;
        }

        elements.table.innerHTML = state.products.map((product) => `
            <tr>
                <td>
                    ${product.image ? `<img class="thumbnail" src="${AdminApp.imageUrl(product.image)}" alt="${AdminApp.escapeHtml(product.name)}">` : `<div class="avatar">${AdminApp.escapeHtml(product.name?.charAt(0) || "P")}</div>`}
                </td>
                <td>
                    <div class="stacked">
                        <strong>${AdminApp.escapeHtml(product.name)}</strong>
                        <span class="muted">${AdminApp.escapeHtml(product.description || "No description")}</span>
                    </div>
                </td>
                <td>
                    <div class="stacked">
                        <strong>${AdminApp.escapeHtml(product.categoryName || "Uncategorized")}</strong>
                        <span class="muted">ID #${AdminApp.escapeHtml(product.categoryId ?? "-")}</span>
                    </div>
                </td>
                <td class="strong">${AdminApp.formatCurrency(product.price)}</td>
                <td>${AdminApp.availabilityBadge(product.isAvailable)}</td>
                <td>${AdminApp.formatDateTime(product.createdAt)}</td>
                <td>
                    <div class="table-actions">
                        <button class="button btn-outline btn-small" type="button" data-edit-product="${product.id}">Edit</button>
                        <button class="button btn-secondary btn-small" type="button" data-toggle-product="${product.id}">${product.isAvailable ? "Set Unavailable" : "Set Available"}</button>
                        <button class="button btn-danger btn-small" type="button" data-delete-product="${product.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");

        bindRowActions();
    }

    function bindRowActions() {
        document.querySelectorAll("[data-edit-product]").forEach((button) => {
            button.addEventListener("click", () => {
                const product = state.products.find((item) => String(item.id) === button.dataset.editProduct);
                openForm(product);
            });
        });

        document.querySelectorAll("[data-toggle-product]").forEach((button) => {
            button.addEventListener("click", async () => {
                const product = state.products.find((item) => String(item.id) === button.dataset.toggleProduct);
                if (!product) {
                    return;
                }

                await saveAvailability(product, !product.isAvailable);
            });
        });

        document.querySelectorAll("[data-delete-product]").forEach((button) => {
            button.addEventListener("click", async () => {
                const product = state.products.find((item) => String(item.id) === button.dataset.deleteProduct);
                if (!product) {
                    return;
                }

                const confirmed = window.confirm(`Delete product "${product.name}"?`);
                if (!confirmed) {
                    return;
                }

                try {
                    await AdminApp.request(`/products/${product.id}`, {
                        method: "DELETE",
                        redirectOn401: false
                    });
                    await loadProducts();
                    AdminApp.setMessage(elements.message, "Product deleted successfully.", "success");
                } catch (error) {
                    AdminApp.setMessage(elements.message, error.message, "error");
                }
            });
        });
    }

    function openForm(product = null) {
        state.editingProduct = product;
        elements.form.reset();
        elements.formMessage.hidden = true;
        elements.image.value = "";
        elements.preview.hidden = true;
        elements.preview.removeAttribute("src");

        if (product) {
            elements.title.textContent = "Edit Product";
            elements.saveButton.textContent = "Update Product";
            elements.id.value = product.id;
            elements.name.value = product.name || "";
            elements.description.value = product.description || "";
            elements.price.value = AdminApp.formatMoneyInput(product.price);
            elements.category.value = product.categoryId || "";
            elements.availability.checked = Boolean(product.isAvailable);

            if (product.image) {
                elements.preview.src = AdminApp.imageUrl(product.image);
                elements.preview.hidden = false;
            }
        } else {
            elements.title.textContent = "Add Product";
            elements.saveButton.textContent = "Save Product";
            elements.id.value = "";
            elements.availability.checked = true;
        }

        AdminApp.openModal(elements.modal);
    }

    function closeForm() {
        AdminApp.closeModal(elements.modal);
        elements.form.reset();
        elements.preview.hidden = true;
        elements.preview.removeAttribute("src");
        elements.formMessage.hidden = true;
        state.editingProduct = null;
    }

    async function saveProduct(event) {
        event.preventDefault();

        const productId = elements.id.value;
        const isEdit = Boolean(productId);
        const formData = new FormData();

        formData.append("name", elements.name.value.trim());
        formData.append("description", elements.description.value.trim());
        formData.append("price", elements.price.value);
        formData.append("categoryId", elements.category.value);
        formData.append("isAvailable", String(elements.availability.checked));

        if (elements.image.files[0]) {
            formData.append("image", elements.image.files[0]);
        }

        AdminApp.setMessage(elements.formMessage, isEdit ? "Updating product..." : "Saving product...", "info");
        elements.saveButton.disabled = true;

        try {
            await AdminApp.request(isEdit ? `/products/${productId}` : "/products", {
                method: isEdit ? "PUT" : "POST",
                body: formData,
                redirectOn401: false
            });

            AdminApp.setMessage(elements.formMessage, isEdit ? "Product updated successfully." : "Product created successfully.", "success");
            await loadCategories();
            await loadProducts();
            closeForm();
        } catch (error) {
            AdminApp.setMessage(elements.formMessage, error.message, "error");
        } finally {
            elements.saveButton.disabled = false;
        }
    }

    async function saveAvailability(product, nextAvailability) {
        const formData = new FormData();
        formData.append("isAvailable", String(nextAvailability));

        try {
            await AdminApp.request(`/products/${product.id}`, {
                method: "PUT",
                body: formData,
                redirectOn401: false
            });

            await loadProducts();
            AdminApp.setMessage(elements.message, `Product marked as ${nextAvailability ? "available" : "unavailable"}.`, "success");
        } catch (error) {
            AdminApp.setMessage(elements.message, error.message, "error");
        }
    }
});