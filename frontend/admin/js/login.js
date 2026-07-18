
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const message = document.getElementById("message");
    const button = document.getElementById("loginButton");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        AdminApp.setMessage(message, "Logging in...", "info");
        button.disabled = true;
        button.textContent = "Logging in...";

        try {
            await AdminApp.request("/auth/login", {
                method: "POST",
                body: {
                    username,
                    password
                },
                redirectOn401: false
            });

            window.location.href = "dashboard.html";
        } catch (error) {
            AdminApp.setMessage(message, error.message || "Backend connection error", "error");
        } finally {
            button.disabled = false;
            button.textContent = "Login";
        }
    });
});