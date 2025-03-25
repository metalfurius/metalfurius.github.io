document.addEventListener("DOMContentLoaded", function() {

    // Preloader
    const preloader = document.querySelector('.preloader');
    setTimeout(() => {
        preloader.style.transition = 'opacity 0.5s';
        preloader.style.opacity = '0';
        setTimeout(() => preloader.style.display = 'none', 500);
    }, 1500);


    // Smooth Scrolling
    const navLinks = document.querySelectorAll('.sticky-nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const offsetTop = targetElement.offsetTop;
                window.scrollTo({
                    top: offsetTop - 60,
                    behavior: 'smooth'
                });

                // Highlight active section
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                this.classList.add('active');

            }
        });
    });



    // Scroll Animations (Sections)
    const sections = document.querySelectorAll('.section');
    const timeline = document.querySelector('.timeline');


    function checkVisibility() {
        sections.forEach(section => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight * 0.8) {
                section.classList.add('show');
            }
        });
        const timelinerect = timeline.getBoundingClientRect();
        if (timelinerect.top < window.innerHeight * 0.8) {
            timeline.classList.add('show-timeline');
        }

    }
    // Check on load and scroll
    checkVisibility();
    window.addEventListener('scroll', checkVisibility);

    // Dice Roll
    const diceRollButton = document.getElementById('dice-roll');
    if (diceRollButton) {
        diceRollButton.addEventListener('click', function() {
            const roll = Math.floor(Math.random() * 20) + 1;
            const resultDiv = document.getElementById('dice-result');
            resultDiv.innerHTML = `You rolled a <strong>${roll}</strong> on a D20!`;
            resultDiv.style.opacity = '1';
            setTimeout(() => {
                resultDiv.style.opacity = '0';
            }, 3000); // Fades out after 3 seconds
        });
    }


    function highlightNavLink() {
        const navLinks = document.querySelectorAll('.sticky-nav a');
        let currentSection = '';

        // Check if scrolled to the bottom
        if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 50)) {
            currentSection = 'contact';
        }
        // If at the top, default to "Home"
        else if (window.scrollY < 100) {
            currentSection = 'home';
        } else {
            // Check which section is in view
            const sections = document.querySelectorAll('.section, .hero');
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (window.scrollY >= (sectionTop - sectionHeight / 3)) {
                    currentSection = section.getAttribute('id');
                }
            });
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }

    const nav = document.querySelector('.sticky-nav');
    window.addEventListener('scroll', function() {
        nav.classList.toggle('shrunk', window.scrollY > 50);
    });

    window.addEventListener('scroll', highlightNavLink);
    document.addEventListener('DOMContentLoaded', highlightNavLink);

    // --- Project Modal Functionality ---
    const projectCards = document.querySelectorAll('.project-card');
    const projectModals = document.querySelectorAll('.project-modal');
    const closeButtons = document.querySelectorAll('.close-modal');

    projectCards.forEach(card => {
        card.addEventListener('click', function(event) {
            // Check if the click target is the "Learn More" button or its parent
            if (event.target.closest('.project-button')) {
                const projectId = this.dataset.project; // Get the project ID
                const modal = document.getElementById(projectId);
                if (modal) {
                    modal.style.display = 'block';
                }
            }

        });
    });

    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.project-modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        projectModals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });

    });


    // Typewriter Effect (Solution 3's approach, but simplified)
    const taglineElement = document.querySelector('.tagline');
    const taglineText = "Crafting Engaging Experiences | Junior Software Developer | Unity & Web Enthusiast"; // Full text
    let charIndex = 0;

    function typeWriter() {
        if (charIndex < taglineText.length) {
            taglineElement.innerHTML = taglineText.substring(0, charIndex + 1) + '<span class="cursor"></span>';
            charIndex++;
            setTimeout(typeWriter, 50); // Typing speed
        }
    }
    // Start typewriter effect after a delay (after preloader)
    setTimeout(typeWriter, 1500);

    // particles.js initialization (after preloader)
    setTimeout(() => {
        particlesJS('particles-js', {
            "particles": {
                "number": {
                    "value": 80,  // Adjust number of particles
                    "density": {
                        "enable": true,
                        "value_area": 800
                    }
                },
                "color": {
                    "value": "#ffffff" // Particle color
                },
                "shape": {
                    "type": "circle", // Particle shape
                    "stroke": {
                        "width": 0,
                        "color": "#000000"
                    },
                },
                "opacity": {
                    "value": 0.5, // Particle opacity
                    "random": false,
                    "anim": {
                        "enable": false,
                        "speed": 1,
                        "opacity_min": 0.1,
                        "sync": false
                    }
                },
                "size": {
                    "value": 3,  // Particle size
                    "random": true,
                    "anim": {
                        "enable": false,
                        "speed": 40,
                        "size_min": 0.1,
                        "sync": false
                    }
                },
                "line_linked": {
                    "enable": true,
                    "distance": 150, // Distance between linked particles
                    "color": "#ffffff", // Line color
                    "opacity": 0.4,    // Line opacity
                    "width": 1       // Line width
                },
                "move": {
                    "enable": true,
                    "speed": 2,     // Particle movement speed
                    "direction": "none",
                    "random": false,
                    "straight": false,
                    "out_mode": "out",
                    "bounce": false,
                    "attract": {
                        "enable": false,
                        "rotateX": 600,
                        "rotateY": 1200
                    }
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onHover": {
                        "enable": true,
                        "mode": "repulse" // Repulse on hover
                    },
                    "onclick": {
                        "enable": true,
                        "mode": "push"  // Push on click
                    },
                    "resize": true
                },
                "modes": {
                    "grab": {
                        "distance": 400,
                        "line_linked": {
                            "opacity": 1
                        }
                    },
                    "bubble": {
                        "distance": 400,
                        "size": 40,
                        "duration": 2,
                        "opacity": 8,
                        "speed": 3
                    },
                    "repulse": {
                        "distance": 100, // Repulse distance
                        "duration": 0.4
                    },
                    "push": {
                        "particles_nb": 4
                    },
                    "remove": {
                        "particles_nb": 2
                    }
                }
            },
            "retina_detect": true
        });
    }, 1500); // Delay to ensure preloader is gone

});