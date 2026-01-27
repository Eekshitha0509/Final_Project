// Get required elements
const studentBtn = document.getElementById("studentBtn");
const wardenBtn = document.getElementById("wardenBtn");
const loginTitle = document.getElementById("loginTitle");
const admissionInput = document.getElementById("admission");
const registerText = document.getElementById("registerText");
const roleInput = document.getElementById("role");
const loginForm = document.getElementById("loginForm");

// Default role
roleInput.value = "student";

// Student button click
studentBtn.addEventListener("click", () => {
    studentBtn.classList.add("active");
    wardenBtn.classList.remove("active");

    loginTitle.innerText = "Student Login";
    admissionInput.placeholder = "Admission / Registration Number";
    registerText.style.display = "block";
    roleInput.value = "student";
});

// Warden button click
wardenBtn.addEventListener("click", () => {
    wardenBtn.classList.add("active");
    studentBtn.classList.remove("active");

    loginTitle.innerText = "Warden Login";
    admissionInput.placeholder = "Warden ID / Email";
    registerText.style.display = "none";
    roleInput.value = "warden";
});

// Login form submit
loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!roleInput.value) {
        alert("Please select Student or Warden");
        return;
    }

    // Redirect after login
    window.location.href = "profile.html";
});
