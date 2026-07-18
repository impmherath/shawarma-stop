document.addEventListener("DOMContentLoaded", async () => {
    await AdminApp.ensureAuthenticated("login.html");
    AdminApp.bindLogout();
    AdminApp.setActiveNav("gallery.html");

    const state = {
        gallery: [],
        editing: null,
        draggedId: null,
    };

    const elements = {
        message: document.getElementById("galleryMessage"),
        count: document.getElementById("galleryCount"),
        grid: document.getElementById("galleryGrid"),
        filters: document.getElementById("galleryFilters"),
        search: document.getElementById("gallerySearch"),
        statusFilter: document.getElementById("galleryStatusFilter"),
        resetButton: document.getElementById("resetGallery"),
        addButton: document.getElementById("addGalleryButton"),
        modal: document.getElementById("galleryModal"),
        form: document.getElementById("galleryForm"),
        formMessage: document.getElementById("galleryFormMessage"),
        title: document.getElementById("galleryModalTitle"),
        saveButton: document.getElementById("saveGalleryButton"),
        id: document.getElementById("galleryId"),
        name: document.getElementById("galleryTitle"),
        description: document.getElementById("galleryDescription"),
        order: document.getElementById("galleryDisplayOrder"),
        status: document.getElementById("galleryStatus"),
        image: document.getElementById("galleryImage"),
        preview: document.getElementById("galleryImagePreview"),
    };

    bindEvents();
    await loadGallery();

    function bindEvents() {
        elements.filters.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loadGallery();
        });

        elements.resetButton.addEventListener("click", async () => {
            elements.search.value = "";
            elements.statusFilter.value = "";
            await loadGallery();
        });

        elements.addButton.addEventListener("click", () => openForm());
        elements.form.addEventListener("submit", saveGallery);

        document.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.addEventListener("click", closeForm);
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

    async function loadGallery() {
        AdminApp.setMessage(elements.message, "Loading gallery...", "info");
        elements.grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading gallery images</p></div>`;

        const params = new URLSearchParams();
        params.set("includeHidden", "true");
        if (elements.search.value.trim()) {
            params.set("q", elements.search.value.trim());
        }

        try {
            const response = await AdminApp.request(`/gallery?${params.toString()}`, {
                redirectOn401: false,
            });

            state.gallery = Array.isArray(response.gallery) ? response.gallery : [];

            if (elements.statusFilter.value) {
                state.gallery = state.gallery.filter((item) => item.status === elements.statusFilter.value);
            }

            renderGallery();
            elements.count.textContent = `${state.gallery.length} image${state.gallery.length === 1 ? "" : "s"}`;
            AdminApp.setMessage(elements.message, state.gallery.length ? "Gallery loaded successfully." : "No gallery images found.", state.gallery.length ? "success" : "info");
        } catch (error) {
            console.error(error);
            AdminApp.setMessage(elements.message, error.message, "error");
            AdminApp.setEmptyState(elements.grid, "Unable to load gallery", "Please check the backend connection and try again.");
        }
    }

    function renderGallery() {
        if (!state.gallery.length) {
            AdminApp.setEmptyState(elements.grid, "No gallery images found", "Upload your first gallery image to populate the customer website.");
            return;
        }

        const canReorder = !elements.search.value.trim() && !elements.statusFilter.value;

        elements.grid.innerHTML = state.gallery.map((item) => `
            <article class="gallery-card" draggable="${canReorder ? "true" : "false"}" data-gallery-id="${item.id}">
                <div class="gallery-thumb">
                    ${item.image ? `<img src="${AdminApp.imageUrl(item.image)}" alt="${AdminApp.escapeHtml(item.title)}" class="media-preview-image">` : `<div class="empty-state" style="min-height:100%; padding:24px;"><h3>Missing Image</h3><p>No image uploaded yet.</p></div>`}
                </div>
                <div class="gallery-meta">
                    <div class="gallery-title">${AdminApp.escapeHtml(item.title)}</div>
                    <div class="gallery-description">${AdminApp.escapeHtml(item.description || "No description")}</div>
                    <div class="table-meta">
                        ${AdminApp.statusBadge(item.status)}
                        <span class="chip">Order ${AdminApp.escapeHtml(item.displayOrder ?? 0)}</span>
                        <span class="chip">${AdminApp.formatDateTime(item.createdAt)}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="button btn-outline btn-small" type="button" data-edit-gallery="${item.id}">Edit</button>
                    <button class="button btn-danger btn-small" type="button" data-delete-gallery="${item.id}">Delete</button>
                </div>
            </article>
        `).join("");

        bindCardEvents(canReorder);
    }

    function bindCardEvents(canReorder) {
        document.querySelectorAll("[data-edit-gallery]").forEach((button) => {
            button.addEventListener("click", () => {
                const item = state.gallery.find((entry) => String(entry.id) === button.dataset.editGallery);
                openForm(item);
            });
        });

        document.querySelectorAll("[data-delete-gallery]").forEach((button) => {
            button.addEventListener("click", async () => {
                const item = state.gallery.find((entry) => String(entry.id) === button.dataset.deleteGallery);
                if (!item) return;

                if (!window.confirm(`Delete gallery image "${item.title}"?`)) return;

                try {
                    await AdminApp.request(`/gallery/${item.id}`, {
                        method: "DELETE",
                        redirectOn401: false,
                    });

                    AdminApp.setMessage(elements.message, "Gallery image deleted successfully.", "success");
                    await loadGallery();
                } catch (error) {
                    AdminApp.setMessage(elements.message, error.message, "error");
                }
            });
        });

        if (!canReorder) {
            return;
        }

        document.querySelectorAll("[data-gallery-id]").forEach((card) => {
            card.addEventListener("dragstart", () => {
                state.draggedId = card.dataset.galleryId;
                card.classList.add("dragging");
            });

            card.addEventListener("dragend", () => {
                state.draggedId = null;
                card.classList.remove("dragging");
            });

            card.addEventListener("dragover", (event) => event.preventDefault());

            card.addEventListener("drop", async (event) => {
                event.preventDefault();
                const targetId = card.dataset.galleryId;
                if (!state.draggedId || state.draggedId === targetId) return;

                const fromIndex = state.gallery.findIndex((item) => String(item.id) === state.draggedId);
                const toIndex = state.gallery.findIndex((item) => String(item.id) === targetId);
                if (fromIndex === -1 || toIndex === -1) return;

                const [moved] = state.gallery.splice(fromIndex, 1);
                state.gallery.splice(toIndex, 0, moved);
                state.gallery = state.gallery.map((item, index) => ({ ...item, displayOrder: index }));
                await persistOrder();
            });
        });
    }

    async function persistOrder() {
        try {
            await Promise.all(
                state.gallery.map((item) => AdminApp.request(`/gallery/${item.id}`, {
                    method: "PUT",
                    body: {
                        title: item.title,
                        description: item.description || "",
                        displayOrder: item.displayOrder,
                        status: item.status,
                    },
                    redirectOn401: false,
                }))
            );
            AdminApp.setMessage(elements.message, "Gallery order updated.", "success");
            await loadGallery();
        } catch (error) {
            AdminApp.setMessage(elements.message, error.message, "error");
        }
    }

    function openForm(item = null) {
        state.editing = item;
        elements.form.reset();
        elements.formMessage.hidden = true;
        elements.image.value = "";
        elements.preview.hidden = true;
        elements.preview.removeAttribute("src");

        if (item) {
            elements.title.textContent = "Edit Gallery Image";
            elements.saveButton.textContent = "Update Image";
            elements.id.value = item.id;
            elements.name.value = item.title || "";
            elements.description.value = item.description || "";
            elements.order.value = item.displayOrder ?? 0;
            elements.status.value = item.status || "Visible";

            if (item.image) {
                elements.preview.src = AdminApp.imageUrl(item.image);
                elements.preview.hidden = false;
            }
        } else {
            elements.title.textContent = "Add Gallery Image";
            elements.saveButton.textContent = "Save Image";
            elements.id.value = "";
            elements.order.value = state.gallery.length;
            elements.status.value = "Visible";
        }

        AdminApp.openModal(elements.modal);
    }

    function closeForm() {
        AdminApp.closeModal(elements.modal);
        elements.form.reset();
        elements.preview.hidden = true;
        elements.preview.removeAttribute("src");
        elements.formMessage.hidden = true;
        state.editing = null;
    }

    async function saveGallery(event) {
        event.preventDefault();

        const galleryId = elements.id.value;
        const isEdit = Boolean(galleryId);
        const formData = new FormData();

        formData.append("title", elements.name.value.trim());
        formData.append("description", elements.description.value.trim());
        formData.append("displayOrder", elements.order.value);
        formData.append("status", elements.status.value);

        if (elements.image.files[0]) {
            formData.append("image", elements.image.files[0]);
        }

        AdminApp.setMessage(elements.formMessage, isEdit ? "Updating gallery image..." : "Saving gallery image...", "info");
        elements.saveButton.disabled = true;

        try {
            await AdminApp.request(isEdit ? `/gallery/${galleryId}` : "/gallery", {
                method: isEdit ? "PUT" : "POST",
                body: formData,
                redirectOn401: false,
            });

            AdminApp.setMessage(elements.formMessage, isEdit ? "Gallery image updated successfully." : "Gallery image created successfully.", "success");
            await loadGallery();
            closeForm();
        } catch (error) {
            AdminApp.setMessage(elements.formMessage, error.message, "error");
        } finally {
            elements.saveButton.disabled = false;
        }
    }
});