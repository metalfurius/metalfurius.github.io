// Wait for DOM to fully load
document.addEventListener('DOMContentLoaded', () => {
    // Preloader
    setTimeout(() => {
        const preloader = document.querySelector('.preloader');
        if (preloader) {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }
    }, 1000);

    // Navigation scroll effect
    const header = document.querySelector('header');
    const navLinks = document.querySelectorAll('.nav-links a');

    window.addEventListener('scroll', () => {
        // Add/remove scrolled class to header
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Update active nav link based on scroll position
        updateActiveNavLink();
    });

    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Fade-in animations on scroll
    const fadeElements = document.querySelectorAll('.fade-in');

    const fadeInOnScroll = () => {
        fadeElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;

            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('visible');
            }
        });
    };

    // Initial check for elements in view
    fadeInOnScroll();
    window.addEventListener('scroll', fadeInOnScroll);

    // Contact form handling
    const contactForm = document.getElementById('contact-form');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;

            // Basic validation
            if (!name || !email || !message) {
                alert('Please fill in all fields');
                return;
            }

            // Here you would normally send the form data to a server
            // For demonstration, we'll just log the data and show a success message
            console.log('Form submitted:', { name, email, message });

            // Clear form
            contactForm.reset();

            // Show success message (you could create a more sophisticated UI for this)
            alert('Message sent successfully!');
        });
    }

    const typeWriter = () => {
        const text = "Software Developer | Game Creator | Dice Maker";
        const tagline = document.querySelector('.tagline');
        let i = 0;

        function type() {
            if (i < text.length) {
                tagline.innerHTML += text.charAt(i);
                i++;
                setTimeout(type, 50);
            }
        }

        type();
    };

// Call this after preloader finishes
    setTimeout(typeWriter, 1500);

// Add animated background with floating shapes
    const createFloatingElements = () => {
        const particles = document.querySelector('.particles-container');
        const shapes = ['square', 'circle', 'triangle'];

        for (let i = 0; i < 20; i++) {
            const element = document.createElement('div');
            element.classList.add('floating-shape');
            element.classList.add(shapes[Math.floor(Math.random() * shapes.length)]);

            // Random positions and delays
            element.style.left = `${Math.random() * 100}%`;
            element.style.top = `${Math.random() * 100}%`;
            element.style.animationDelay = `${Math.random() * 5}s`;
            element.style.animationDuration = `${Math.random() * 10 + 10}s`;

            particles.appendChild(element);
        }
    };

    setTimeout(createFloatingElements, 1000);

    // Dice roll functionality
    const diceBtn = document.getElementById('dice-btn');
    const diceResult = document.getElementById('dice-result');

    if (diceBtn && diceResult) {
        diceBtn.addEventListener('click', () => {
            // Animate the dice
            diceBtn.classList.add('rolling');

            // Generate random number between 1 and 20 (D20)
            const rollResult = Math.floor(Math.random() * 20) + 1;

            // Update result after a short delay
            setTimeout(() => {
                diceResult.innerHTML = `<span>You rolled a ${rollResult}!</span>`;
                diceResult.classList.add('show');
                diceBtn.classList.remove('rolling');

                // Hide result after 3 seconds
                setTimeout(() => {
                    diceResult.classList.remove('show');
                }, 3000);
            }, 600);
        });
    }

    // Helper function to update active nav link
    function updateActiveNavLink() {
        const sections = document.querySelectorAll('section');
        const scrollPosition = window.scrollY;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
});

// Add CSS for fade-in animations (if not already in styles.css)
document.head.insertAdjacentHTML('beforeend', `
  <style>
    .fade-in {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .fade-in.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .dice-btn.rolling {
      animation: roll 0.6s ease;
    }
    .dice-result {
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }
    .dice-result.show {
      opacity: 1;
      transform: translateY(0);
    }
    @keyframes roll {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
`);