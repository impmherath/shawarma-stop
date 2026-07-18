document.addEventListener("DOMContentLoaded", async () => {
    await AdminApp.ensureAuthenticated("login.html");
    AdminApp.bindLogout();
    AdminApp.setActiveNav("media.html");

    const state = {
        media: [],
        selected: null,
    };

    const elements = {
        message: document.getElementById("mediaMessage"),
        count: document.getElementById("mediaCount"),
        grid: document.getElementById("mediaGrid"),
        filters: document.getElementById("mediaFilters"),
        search: document.getElementById("mediaSearch"),
        typeFilter: document.getElementById("mediaTypeFilter"),
        resetButton: document.getElementById("resetMedia"),
        modal: document.getElementById("mediaModal"),
        title: document.getElementById("mediaModalTitle"),
        previewImage: document.getElementById("mediaPreviewImage"),
        previewMeta: document.getElementById("mediaPreviewMeta"),
        replaceButton: document.getElementById("replaceMediaButton"),
        deleteButton: document.getElementById("deleteMediaButton"),
        replaceInput: document.getElementById("replaceMediaInput"),
    };

    bindEvents();
    await loadMedia();

    function bindEvents() {
        elements.filters.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loadMedia();
        });

        elements.resetButton.addEventListener("click", async () => {
            elements.search.value = "";
            elements.typeFilter.value = "all";
            await loadMedia();
        });

        document.querySelectorAll("[data-close-media-modal]").forEach((button) => {
            button.addEventListener("click", closePreview);
        });

        elements.replaceButton.addEventListener("click", () => {
            if (!state.selected) return;
            elements.replaceInput.value = "";
            elements.replaceInput.click();
        });

        elements.replaceInput.addEventListener("change", async () => {
            const file = elements.replaceInput.files[0];
            if (!file || !state.selected) return;
            await replaceSelected(file);
        });

        elements.deleteButton.addEventListener("click", async () => {
            if (!state.selected) return;
            const confirmed = window.confirm(`Delete this ${state.selected.sourceType} image?`);
            if (!confirmed) return;

            try {
                await AdminApp.request(`/media/${state.selected.id}`, {
                    method: "DELETE",
                    redirectOn401: false,
                });
                AdminApp.setMessage(elements.message, "Media item deleted successfully.", "success");
                closePreview();
                await loadMedia();
            } catch (error) {
                AdminApp.setMessage(elements.message, error.message, "error");
            }
        });
    }

    async function loadMedia() {
        AdminApp.setMessage(elements.message, "Loading media library...", "info");
        elements.grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading media assets</p></div>`;

        const params = new URLSearchParams();
        params.set("type", elements.typeFilter.value || "all");
        if (elements.search.value.trim()) {
            params.set("q", elements.search.value.trim());
        }

        try {
            const response = await AdminApp.request(`/media?${params.toString()}`, {
                redirectOn401: false,
            });

            state.media = Array.isArray(response.media) ? response.media : [];
            elements.count.textContent = `${state.media.length} asset${state.media.length === 1 ? "" : "s"}`;
            AdminApp.setMessage(elements.message, state.media.length ? "Media loaded successfully." : "No media items found.", state.media.length ? "success" : "info");
            renderMedia();
        } catch (error) {
            console.error(error);
            AdminApp.setMessage(elements.message, error.message, "error");
            AdminApp.setEmptyState(elements.grid, "Unable to load media", "Please check the backend connection and try again.");
        }
    }

    function renderMedia() {
        if (!state.media.length) {
            AdminApp.setEmptyState(elements.grid, "No media found", "Uploaded product and gallery images will appear here.");
            return;
        }

        elements.grid.innerHTML = state.media.map((item) => `
            <article class="media-card">
                <div class="media-thumb">
                    <img src="${AdminApp.imageUrl(item.image)}" alt="${AdminApp.escapeHtml(item.title)}" class="media-preview-image" loading="lazy">
                </div>
                <div class="media-meta">
                    <div class="media-title">${AdminApp.escapeHtml(item.title)}</div>
                    <div class="media-description">${AdminApp.escapeHtml(item.description || "No description")}</div>
                    <div class="table-meta">
                        <span class="chip">${AdminApp.escapeHtml(item.sourceType)}</span>
                        <span class="chip">${formatBytes(item.sizeBytes)}</span>
                        <span class="chip">${item.width}×${item.height}</span>
                    </div>
                    <div class="table-meta">
                        <span class="chip">${AdminApp.formatDateTime(item.createdAt)}</span>
                        ${item.displayOrder !== undefined ? `<span class="chip">Order ${AdminApp.escapeHtml(item.displayOrder)}</span>` : ""}
                        ${item.status ? AdminApp.statusBadge(item.status) : ""}
                    </div>
                </div>
                <div class="card-actions">
                    <button class="button btn-outline btn-small" type="button" data-preview-media="${item.id}">Preview</button>
                    <button class="button btn-secondary btn-small" type="button" data-replace-media="${item.id}">Replace</button>
                    <button class="button btn-danger btn-small" type="button" data-delete-media="${item.id}">Delete</button>
                </div>
            </article>
        `).join("");

        bindItemActions();
    }

    function bindItemActions() {
        document.querySelectorAll("[data-preview-media]").forEach((button) => {
            button.addEventListener("click", () => {
                const item = state.media.find((entry) => entry.id === button.dataset.previewMedia);
                if (item) openPreview(item);
            });
        });

        document.querySelectorAll("[data-replace-media]").forEach((button) => {
            button.addEventListener("click", () => {
                const item = state.media.find((entry) => entry.id === button.dataset.replaceMedia);
                if (item) openPreview(item, true);
            });
        });

        document.querySelectorAll("[data-delete-media]").forEach((button) => {
            button.addEventListener("click", async () => {
                const item = state.media.find((entry) => entry.id === button.dataset.deleteMedia);
                if (!item) return;

                const confirmed = window.confirm(`Delete ${item.title}?`);
                if (!confirmed) return;

                try {
                    await AdminApp.request(`/media/${item.id}`, {
                        method: "DELETE",
                        redirectOn401: false,
                    });
                    AdminApp.setMessage(elements.message, "Media item deleted successfully.", "success");
                    await loadMedia();
                } catch (error) {
                    AdminApp.setMessage(elements.message, error.message, "error");
                }
            });
        });
    }

    function openPreview(item, replaceMode = false) {
        state.selected = item;
        elements.title.textContent = replaceMode ? `Replace ${item.title}` : item.title;
        elements.previewImage.src = AdminApp.imageUrl(item.image);
        elements.previewImage.alt = item.title;
        elements.previewMeta.innerHTML = `
            <div><strong>Source</strong><div>${AdminApp.escapeHtml(item.sourceType)}</div></div>
            <div><strong>Size</strong><div>${formatBytes(item.sizeBytes)}</div></div>
            <div><strong>Dimensions</strong><div>${item.width} × ${item.height}</div></div>
            <div><strong>Uploaded</strong><div>${AdminApp.formatDateTime(item.createdAt)}</div></div>
        `;
        AdminApp.openModal(elements.modal);
    }

    function closePreview() {
        AdminApp.closeModal(elements.modal);
        state.selected = null;
    }

    async function replaceSelected(file) {
        if (!state.selected) return;

        const selected = state.selected;
        const isProduct = selected.sourceType === "product";
        const endpoint = isProduct ? `/products/${selected.sourceId}` : `/gallery/${selected.sourceId}`;

        try {
            if (isProduct) {
                const response = await AdminApp.request(`/products/${selected.sourceId}`, { redirectOn401: false });
                const product = response.product;
                const formData = new FormData();
                formData.append("name", product.name || selected.title);
                formData.append("description", product.description || "");
                formData.append("price", product.price);
                formData.append("categoryId", product.categoryId || "");
                formData.append("isAvailable", String(product.isAvailable));
                formData.append("image", file);

                await AdminApp.request(endpoint, {
                    method: "PUT",
                    body: formData,
                    redirectOn401: false,
                });
            } else {
                const formData = new FormData();
                formData.append("title", selected.title);
                formData.append("description", selected.description || "");
                formData.append("displayOrder", selected.displayOrder ?? 0);
                formData.append("status", selected.status || "Visible");
                formData.append("image", file);

                await AdminApp.request(endpoint, {
                    method: "PUT",
                    body: formData,
                    redirectOn401: false,
                });
            }

            AdminApp.setMessage(elements.message, "Media image replaced successfully.", "success");
            closePreview();
            await loadMedia();
        } catch (error) {
            AdminApp.setMessage(elements.message, error.message, "error");
        }
    }

    function formatBytes(bytes) {
        const value = Number(bytes || 0);
        if (!value) return "0 KB";
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), sizes.length - 1);
        return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`;
    }
});