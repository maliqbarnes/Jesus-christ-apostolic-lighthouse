const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
menuToggle?.addEventListener('click', () => navLinks.classList.toggle('open'));

document.getElementById('year').textContent = new Date().getFullYear();

const slides = [...document.querySelectorAll('.slide')];
let current = 0;
function showSlide(index) {
  slides[current].classList.remove('active');
  current = (index + slides.length) % slides.length;
  slides[current].classList.add('active');
}
document.querySelector('.next')?.addEventListener('click', () => showSlide(current + 1));
document.querySelector('.prev')?.addEventListener('click', () => showSlide(current - 1));
setInterval(() => showSlide(current + 1), 5000);
