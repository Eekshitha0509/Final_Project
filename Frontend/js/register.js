document.getElementById("registerForm").addEventListener("submit", function (e) {
    e.preventDefault();

    alert("Registration successful");

    // Redirect to profile page
    window.location.href = "profile.html";
});
