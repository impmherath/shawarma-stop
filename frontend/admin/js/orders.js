document.addEventListener("DOMContentLoaded", async () => {
    await AdminApp.ensureAuthenticated("login.html");
    AdminApp.bindLogout();
    AdminApp.setActiveNav("orders.html");

    const state = {
        orders: [],
        selectedOrder: null
    };

    const elements = {
        message: document.getElementById("ordersMessage"),
        count: document.getElementById("ordersCount"),
        table: document.getElementById("ordersTable"),
        filters: document.getElementById("ordersFilters"),
        search: document.getElementById("orderSearch"),
        statusFilter: document.getElementById("statusFilter"),
        resetButton: document.getElementById("resetOrders"),
        modal: document.getElementById("orderModal"),
        title: document.getElementById("orderModalTitle"),
        customerDetails: document.getElementById("orderCustomerDetails"),
        itemsList: document.getElementById("orderItemsList"),
        status: document.getElementById("orderStatus"),
        formMessage: document.getElementById("orderFormMessage"),
        saveButton: document.getElementById("saveOrderButton"),
        deleteButton: document.getElementById("deleteOrderButton")
    };

    bindEvents();
    await loadOrders();

    function bindEvents() {
        elements.filters.addEventListener("submit", async (event) => {
            event.preventDefault();
            await loadOrders();
        });

        elements.resetButton.addEventListener("click", async () => {
            elements.search.value = "";
            elements.statusFilter.value = "";
            await loadOrders();
        });

        elements.saveButton.addEventListener("click", saveStatus);
        elements.deleteButton.addEventListener("click", deleteOrder);

        document.querySelectorAll("[data-close-modal]").forEach((button) => {
            button.addEventListener("click", () => closeModal());
        });
    }

    async function loadOrders() {
        AdminApp.setMessage(elements.message, "Loading orders...", "info");
        elements.table.innerHTML = `<tr><td colspan="7"><div class="loading-state"><div class="spinner"></div><p>Loading orders</p></div></td></tr>`;

        const params = new URLSearchParams();
        if (elements.search.value.trim()) {
            params.set("search", elements.search.value.trim());
        }
        if (elements.statusFilter.value) {
            params.set("status", elements.statusFilter.value);
        }

        try {
            const response = await AdminApp.request(`/orders${params.toString() ? `?${params.toString()}` : ""}`, {
                redirectOn401: false
            });

            state.orders = response.orders || [];
            elements.count.textContent = `${state.orders.length} order${state.orders.length === 1 ? "" : "s"}`;
            AdminApp.setMessage(elements.message, state.orders.length ? "Orders loaded successfully." : "No orders found for the selected filters.", state.orders.length ? "success" : "info");
            renderOrders();
        } catch (error) {
            console.error(error);
            AdminApp.setMessage(elements.message, error.message, "error");
            AdminApp.setEmptyState(elements.table, "Unable to load orders", "Please check the backend connection and try again.");
        }
    }

    function renderOrders() {
        if (!state.orders.length) {
            AdminApp.setEmptyState(elements.table, "No orders found", "Try widening your filters or wait for new orders to arrive.");
            return;
        }

        elements.table.innerHTML = state.orders.map((order) => `
            <tr>
                <td class="strong">#${AdminApp.escapeHtml(order.id)}</td>
                <td>
                    <div class="stacked">
                        <strong>${AdminApp.escapeHtml(order.customerName || "-")}</strong>
                        <span class="muted">${AdminApp.escapeHtml(order.address || "No address")}</span>
                    </div>
                </td>
                <td>${AdminApp.escapeHtml(order.phone || "-")}</td>
                <td>
                    <div class="stacked">
                        ${(order.items || []).slice(0, 3).map((item) => `<span class="chip">${AdminApp.escapeHtml(item.productName || "Item")} × ${AdminApp.escapeHtml(item.quantity)}</span>`).join("") || '<span class="muted">No items</span>'}
                    </div>
                </td>
                <td class="strong">${AdminApp.formatCurrency(order.total)}</td>
                <td>${AdminApp.statusBadge(order.status)}</td>
                <td>${AdminApp.formatDateTime(order.createdAt)}</td>
                <td>
                    <div class="table-actions">
                        <button class="button btn-outline btn-small" type="button" data-view-order="${order.id}">View</button>
                        <button class="button btn-danger btn-small" type="button" data-delete-order="${order.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `).join("");

        document.querySelectorAll("[data-view-order]").forEach((button) => {
            button.addEventListener("click", () => openOrder(button.dataset.viewOrder));
        });

        document.querySelectorAll("[data-delete-order]").forEach((button) => {
            button.addEventListener("click", async () => {
                const order = state.orders.find((item) => String(item.id) === button.dataset.deleteOrder);
                if (!order) {
                    return;
                }

                if (!window.confirm(`Delete order #${order.id} for ${order.customerName}?`)) {
                    return;
                }

                try {
                    await AdminApp.request(`/orders/${order.id}`, {
                        method: "DELETE",
                        redirectOn401: false
                    });
                    AdminApp.setMessage(elements.message, "Order deleted successfully.", "success");
                    await loadOrders();
                } catch (error) {
                    AdminApp.setMessage(elements.message, error.message, "error");
                }
            });
        });
    }

    async function openOrder(orderId) {
        try {
            const response = await AdminApp.request(`/orders/${orderId}`, {
                redirectOn401: false
            });

            state.selectedOrder = response.order;
            populateOrderModal(response.order);
            AdminApp.openModal(elements.modal);
        } catch (error) {
            AdminApp.setMessage(elements.message, error.message, "error");
        }
    }

    function populateOrderModal(order) {
        elements.title.textContent = `Order #${order.id}`;
        elements.formMessage.hidden = true;
        elements.status.innerHTML = AdminApp.orderStatuses.map((status) => `<option value="${status}">${status}</option>`).join("");
        elements.status.value = order.status;

        elements.customerDetails.innerHTML = [
            ["Customer", order.customerName || "-"],
            ["Phone", order.phone || "-"],
            ["Address", order.address || "-"],
            ["Note", order.note || "No note"],
            ["Source", order.source || "Admin"],
            ["Created", AdminApp.formatDateTime(order.createdAt)]
        ].map(([label, value]) => `<li><span class="muted">${AdminApp.escapeHtml(label)}</span><strong>${AdminApp.escapeHtml(value)}</strong></li>`).join("");

        const items = Array.isArray(order.items) ? order.items : [];
        if (!items.length) {
            elements.itemsList.innerHTML = `
                <div class="empty-state">
                    <h3>No items on this order</h3>
                    <p>The order items table is empty for this record.</p>
                </div>
            `;
        } else {
            elements.itemsList.innerHTML = items.map((item) => `
                <div class="order-item">
                    <div>
                        <strong>${AdminApp.escapeHtml(item.productName || "Product")}</strong>
                        <div class="order-meta">
                            <span class="chip">Qty ${AdminApp.escapeHtml(item.quantity)}</span>
                            <span class="chip">Unit ${AdminApp.formatCurrency(item.unitPrice)}</span>
                        </div>
                    </div>
                    <div class="strong">${AdminApp.formatCurrency(item.subtotal)}</div>
                </div>
            `).join("");
        }
    }

    async function saveStatus() {
        if (!state.selectedOrder) {
            return;
        }

        elements.saveButton.disabled = true;
        AdminApp.setMessage(elements.formMessage, "Saving status...", "info");

        try {
            await AdminApp.request(`/orders/${state.selectedOrder.id}/status`, {
                method: "PATCH",
                body: { status: elements.status.value },
                redirectOn401: false
            });

            AdminApp.setMessage(elements.formMessage, "Order status updated successfully.", "success");
            await loadOrders();
        } catch (error) {
            AdminApp.setMessage(elements.formMessage, error.message, "error");
        } finally {
            elements.saveButton.disabled = false;
        }
    }

    async function deleteOrder() {
        if (!state.selectedOrder) {
            return;
        }

        if (!window.confirm(`Delete order #${state.selectedOrder.id}?`)) {
            return;
        }

        elements.deleteButton.disabled = true;

        try {
            await AdminApp.request(`/orders/${state.selectedOrder.id}`, {
                method: "DELETE",
                redirectOn401: false
            });

            AdminApp.setMessage(elements.message, "Order deleted successfully.", "success");
            closeModal();
            await loadOrders();
        } catch (error) {
            AdminApp.setMessage(elements.formMessage, error.message, "error");
        } finally {
            elements.deleteButton.disabled = false;
        }
    }

    function closeModal() {
        AdminApp.closeModal(elements.modal);
        state.selectedOrder = null;
        elements.formMessage.hidden = true;
    }
});