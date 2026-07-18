document.addEventListener("DOMContentLoaded", async () => {
    try {
        await AdminApp.ensureAuthenticated("login.html");
        AdminApp.bindLogout();
        AdminApp.setActiveNav("dashboard.html");
        await loadDashboard();

        window.addEventListener("storage", (event) => {
            if (event.key === "shawarma:lastOrderAt") {
                loadDashboard().catch((error) => console.error(error));
            }
        });

        setInterval(() => {
            loadDashboard().catch((error) => console.error(error));
        }, 15000);
    } catch (error) {
        console.error(error);
    }
});

async function loadDashboard() {
    const recentOrdersTable = document.getElementById("recentOrdersTable");
    const statusBreakdown = document.getElementById("statusBreakdown");

    if (recentOrdersTable) {
        recentOrdersTable.innerHTML = `<tr><td colspan="5"><div class="loading-state"><div class="spinner"></div><p>Loading recent orders</p></div></td></tr>`;
    }

    if (statusBreakdown) {
        statusBreakdown.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading status summary</p></div>`;
    }

    try {
        const data = await AdminApp.request("/dashboard/stats", {
            redirectOn401: false
        });

        document.getElementById("totalProducts").textContent = data.totalProducts ?? 0;
        document.getElementById("totalCategories").textContent = data.totalCategories ?? 0;
        document.getElementById("totalOrders").textContent = data.totalOrders ?? 0;
        document.getElementById("todaysOrders").textContent = data.todaysOrders ?? 0;

        const recentOrders = Array.isArray(data.recentOrders) ? data.recentOrders : [];

        if (!recentOrders.length) {
            AdminApp.setEmptyState(recentOrdersTable, "No orders yet", "Recent orders will appear here once customers start checking out.");
        } else {
            recentOrdersTable.innerHTML = recentOrders.map((order) => `
                <tr>
                    <td class="strong">#${AdminApp.escapeHtml(order.id)}</td>
                    <td>
                        <div class="stacked">
                            <strong>${AdminApp.escapeHtml(order.customerName || order.customer_name || "-")}</strong>
                            <span class="muted">${AdminApp.escapeHtml(order.phone || "-")}</span>
                        </div>
                    </td>
                    <td>${AdminApp.statusBadge(order.status)}</td>
                    <td class="strong">${AdminApp.formatCurrency(order.total || order.total_amount)}</td>
                    <td>${AdminApp.formatDateTime(order.createdAt || order.created_at)}</td>
                </tr>
            `).join("");
        }

        const breakdown = Array.isArray(data.ordersByStatus) ? data.ordersByStatus : [];
        if (!breakdown.length) {
            statusBreakdown.innerHTML = `
                <div class="empty-state">
                    <h3>No status data yet</h3>
                    <p>Order status summaries will appear here once there are orders to count.</p>
                </div>
            `;
        } else {
            statusBreakdown.innerHTML = breakdown.map((item) => `
                <div class="summary-card">
                    <div class="summary-label">${AdminApp.escapeHtml(item.status)}</div>
                    <div class="summary-value">${AdminApp.escapeHtml(item.count)}</div>
                    <div class="summary-note">Current orders in this status.</div>
                </div>
            `).join("");
        }
    } catch (error) {
        console.error(error);
        if (recentOrdersTable) {
            recentOrdersTable.innerHTML = "";
            AdminApp.setEmptyState(recentOrdersTable, "Unable to load dashboard data", error.message || "Please try again.");
        }
    }
}