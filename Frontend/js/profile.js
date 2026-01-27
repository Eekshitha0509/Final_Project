document.getElementById("profileForm").addEventListener("submit", function (e) {
    e.preventDefault();
    alert("Profile saved successfully");

    window.location.href = "home.html";
});
