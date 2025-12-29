// Help modal initialization
// Loads help content and sets up the help modal using Design System Modal component

import helpContentHtml from '../../help-content.html?raw';

export async function initializeHelpModal(Modal) {
  try {
    const helpContent = helpContentHtml;

    // Create help modal using design system Modal component
    const helpModal = Modal.createHelpModal({
      title: 'Help / User Guide',
      content: helpContent
    });

    // Manually bind trigger button
    const helpButton = document.querySelector('#btn-help');
    if (helpButton) {
      helpButton.addEventListener('click', () => {
        helpModal.open();
      });
    }

  } catch (error) {
    console.error('Failed to load help content:', error);
    // Fallback to placeholder content
    const helpModal = Modal.createHelpModal({
      title: 'Help / User Guide',
      content: '<p>Help content could not be loaded. Please check that help-content.html exists.</p>'
    });

    // Manually bind trigger button
    const helpButton = document.querySelector('#btn-help');
    if (helpButton) {
      helpButton.addEventListener('click', () => {
        helpModal.open();
      });
    }
  }
}

