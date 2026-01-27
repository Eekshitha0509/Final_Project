 document.addEventListener("DOMContentLoaded", function () {
            const form = document.getElementById("registerForm");

            form.addEventListener("submit", function (e) {
                e.preventDefault(); // prevent form from refreshing

                // Optional: show success alert
                alert("Registration successful");

        // Redirect to profile page 
        window.location.href = "profile.html";
    });
});
