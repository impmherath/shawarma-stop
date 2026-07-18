(function () {
    const backendOrigin = `${window.location.protocol}//${window.location.hostname}:5000`;
    const apiBase = `${backendOrigin}/api`;
    const assetBase = backendOrigin;

    const orderStatuses = ["Pending", "Preparing", "Completed", "Cancelled"];

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function formatCurrency(value) {
        const number = Number(value ?? 0);
        return new Intl.NumberFormat("en-LK", {
            style: "currency",
            currency: "LKR",
            maximumFractionDigits: 2
        }).format(Number.isFinite(number) ? number : 0);
    }

    function formatDateTime(value) {
        if (!value) {
            return "-";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat("en-LK", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    }

    function formatDate(value) {
        if (!value) {
            return "-";
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat("en-LK", {
            dateStyle: "medium"
        }).format(date);
    }

    function imageUrl(path) {
        if (!path) {
            return "";
        }

        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        return `${assetBase}${path}`;
    }

    function statusClass(status) {
        switch ((status || "").toLowerCase()) {
            case "completed":
                return "success";
            case "preparing":
                return "warning";
            case "cancelled":
                return "danger";
            case "available":
                return "success";
            case "unavailable":
                return "danger";
            default:
                return "neutral";
        }
    }

    function statusBadge(status) {
        return `<span class="status-badge ${statusClass(status)}">${escapeHtml(status || "Unknown")}</span>`;
    }

    function availabilityBadge(isAvailable) {
        return `<span class="status-badge ${isAvailable ? "success" : "danger"}">${isAvailable ? "Available" : "Unavailable"}</span>`;
    }

    async function request(path, options = {}) {
        const {
            method = "GET",
            body,
            headers = {},
            redirectOn401 = true,
            responseType = "json"
        } = options;

        const fetchOptions = {
            method,
            credentials: "include",
            headers: {
                ...headers
            }
        };

        if (body instanceof FormData) {
            fetchOptions.body = body;
        } else if (body !== undefined) {
            fetchOptions.body = JSON.stringify(body);
            if (!fetchOptions.headers["Content-Type"]) {
                fetchOptions.headers["Content-Type"] = "application/json";
            }
        }

        const response = await fetch(`${apiBase}${path}`, fetchOptions);
        const contentType = response.headers.get("content-type") || "";
        let payload = null;

        if (responseType === "text") {
            payload = await response.text();
        } else if (contentType.includes("application/json")) {
            payload = await response.json();
        } else {
            payload = await response.text();
        }

        if (!response.ok) {
            const message = (payload && typeof payload === "object")
                ? payload.message || payload.error || (Array.isArray(payload.errors) && payload.errors[0] && payload.errors[0].msg) || `Request failed (${response.status})`
                : (typeof payload === "string" && payload) || `Request failed (${response.status})`;

            const error = new Error(message);
            error.status = response.status;
            error.payload = payload;
            error.response = response;

            if (response.status === 401 && redirectOn401) {
                window.location.href = "login.html";
            }

            throw error;
        }

        return payload;
    }

    async function ensureAuthenticated(redirectTo = "login.html") {
        try {
            return await request("/auth/me", {
                redirectOn401: false
            });
        } catch (error) {
            if (error.status === 401) {
                window.location.href = redirectTo;
                return null;
            }

            throw error;
        }
    }

    function bindLogout() {
        const buttons = document.querySelectorAll("[data-logout-button]");

        buttons.forEach((button) => {
            button.addEventListener("click", async () => {
                button.disabled = true;

                try {
                    await request("/auth/logout", {
                        method: "POST",
                        redirectOn401: false
                    });
                } catch (error) {
                    console.error(error);
                } finally {
                    window.location.href = "login.html";
                }
            });
        });
    }

    function setActiveNav(pageName) {
        const currentPage = pageName || window.location.pathname.split("/").pop();
        document.querySelectorAll("[data-nav]").forEach((link) => {
            const target = link.getAttribute("data-nav");
            link.classList.toggle("active", target === currentPage);
        });
    }

    function setMessage(element, message, type = "info") {
        if (!element) {
            return;
        }

        element.className = `page-message ${type}`;
        element.textContent = message || "";
        element.hidden = !message;
    }

    function setEmptyState(container, title, description, actionHtml = "") {
        if (!container) {
            return;
        }

        if (container.tagName === "TBODY") {
            const columnCount = container.closest("table")?.querySelectorAll("thead th").length || 1;
            container.innerHTML = `
                <tr>
                    <td colspan="${columnCount}">
                        <div class="empty-state">
                            <div class="empty-state-icon">•</div>
                            <h3>${escapeHtml(title)}</h3>
                            <p>${escapeHtml(description)}</p>
                            ${actionHtml}
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">•</div>
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(description)}</p>
                ${actionHtml}
            </div>
        `;
    }

    function openModal(modal) {
        if (!modal) {
            return;
        }

        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
    }

    function closeModal(modal) {
        if (!modal) {
            return;
        }

        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
    }

    function formatMoneyInput(value) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
    }

    window.AdminApp = {
        apiBase,
        assetBase,
        orderStatuses,
        escapeHtml,
        formatCurrency,
        formatDateTime,
        formatDate,
        imageUrl,
        statusClass,
        statusBadge,
        availabilityBadge,
        request,
        ensureAuthenticated,
        bindLogout,
        setActiveNav,
        setMessage,
        setEmptyState,
        openModal,
        closeModal,
        formatMoneyInput
    };
})();
