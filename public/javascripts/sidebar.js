var menubtn = document.querySelector("nav .right h4");
var slidebar = document.querySelector("#slidebar");
var menuflag = 0;

menubtn.addEventListener("click", function () {
    if (menuflag == 0) {
        menubtn.innerHTML = "<i class='ri-close-fill'></i>";
        menuflag = 1;
        slidebar.style.transform = "translateX(0%)";
    } else {
        menubtn.innerHTML = "<i class='ri-menu-line'></i>";
        menuflag = 0;
        slidebar.style.transform = "translateX(-100%)";
    }
});