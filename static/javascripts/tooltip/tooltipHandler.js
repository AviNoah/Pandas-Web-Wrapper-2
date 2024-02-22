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

    return height;
}

const isMouseOnTooltip = (event) => {
    return Boolean(tooltipPopup === event.target || tooltipPopup.contains(event.target));
}

const isTriggerElementBeingEdited = (event) => {
    return Boolean(event.target.classList.contains('editing'));
}

const mouseOverFunc = (tooltipText, event) => {
    if (isMouseOnTooltip(event) || isTriggerElementBeingEdited(event))
        return;

    let tooltipX = event.clientX + 10; // Adjust 10px to the right
    let tooltipY = event.clientY + 10; // Adjust 10px downward

    tooltipPopup.innerHTML = tooltipText;

    const width = getTooltipWidth();
    const height = getTooltipHeight();

    // Adjust popup position if it would exceed window boundaries
    if (tooltipX + width > window.innerWidth) {
        tooltipX = event.clientX - 10 - width;
    }
    if (tooltipY + height > window.innerHeight) {
        tooltipY = event.clientY - 10 - height;
    }

    tooltipPopup.style.left = tooltipX + 'px';
    tooltipPopup.style.top = tooltipY + 'px';

    tooltipPopup.classList.add('visible');
};

const mouseOutFunc = (event) => {
    if (isMouseOnTooltip(event))
        return;
    tooltipPopup.classList.remove('visible');
};

export const initTooltipTriggerEl = (tooltipTriggerEl) => {
    const tooltipText = tooltipTriggerEl.getAttribute('data-tooltip');
    tooltipTriggerEl.addEventListener('mouseover', (event) => mouseOverFunc(tooltipText, event));
    tooltipTriggerEl.addEventListener('mouseout', mouseOutFunc);
};

tooltipTriggerList.forEach(initTooltipTriggerEl);
