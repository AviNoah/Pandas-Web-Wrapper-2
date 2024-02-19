const tooltipTriggerList = document.querySelectorAll('.tooltip');
const tooltipPopup = document.getElementById('tooltip');

// Function to get the width of the tooltip popup after content is populated
function getTooltipWidth() {
    // Display the tooltip temporarily to measure its width
    tooltipPopup.style.display = 'block';

    // Get the width of the tooltip
    const width = tooltipPopup.offsetWidth;

    // Hide the tooltip again
    tooltipPopup.style.display = null;

    return width;
}

// Function to get the width of the tooltip popup after content is populated
function getTooltipHeight() {
    // Display the tooltip temporarily to measure its width
    const oldDisplay = tooltipPopup.style.display;
    tooltipPopup.style.display = 'block';

    // Get the width of the tooltip
    const height = tooltipPopup.offsetHeight;

    // Hide the tooltip again
    tooltipPopup.style.display = null;
    console.log(oldDisplay)

    return height;
}

const mouseOverFunc = (tooltipText, event) => {
    const tooltipX = event.clientX + 10; // Adjust 10px to the right
    const tooltipY = event.clientY + 10; // Adjust 10px downward

    tooltipPopup.innerHTML = tooltipText;
    tooltipPopup.style.left = tooltipX + 'px';
    tooltipPopup.style.top = tooltipY + 'px';

    const width = getTooltipWidth();
    const height = getTooltipHeight();

    // Adjust popup position if it would exceed window boundaries
    if (tooltipX + width > window.innerWidth) {
        tooltipPopup.style.left = (window.innerWidth - width - 10) + 'px';
    }
    if (tooltipY + height > window.innerHeight) {
        tooltipPopup.style.top = (window.innerHeight - height - 10) + 'px';
    }

    tooltipPopup.classList.add('visible');
};

const mouseOutFunc = () => {
    tooltipPopup.classList.remove('visible');
};

export const initTooltipTriggerEl = (tooltipTriggerEl) => {
    const tooltipText = tooltipTriggerEl.getAttribute('data-tooltip');
    tooltipTriggerEl.addEventListener('mouseover', (event) => mouseOverFunc(tooltipText, event));
    tooltipTriggerEl.addEventListener('mouseout', mouseOutFunc);
};

tooltipTriggerList.forEach(initTooltipTriggerEl);
