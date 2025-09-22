import React, { useState, useEffect } from 'react';

const CreateCustomTabModal = ({ onClose, onCreate, existingTabs }) => {
  const [tabName, setTabName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false); // New state for duplicate check

  const suggestedTags = [
    { emoji: "❤️", label: "Interested" },
    { emoji: "😌", label: "New Clients" },
    { emoji: "👑", label: "VIP" },
    { emoji: "🔜", label: "Invoice Sent" },
    { emoji: "💬", label: "Negotiation" },
    { emoji: "💰", label: "Paid" },
  ];

  // Helper to check if a tab (by label) already exists
  const isTabExisting = React.useCallback(
    (labelToCheck) => {
      return existingTabs.some(tab => tab.label.toLowerCase() === labelToCheck.toLowerCase());
    },
    [existingTabs]
  );

  // Effect to re-check for duplicates whenever tabName changes
  useEffect(() => {
    setIsDuplicate(isTabExisting(tabName));
  }, [tabName, existingTabs, isTabExisting]);


  const handleTagClick = (emoji, label) => {
    setTabName(label);
    setSelectedEmoji(emoji);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    const emojiMatch = value.match(/^(\p{Emoji}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\p{Extended_Pictographic})/u);

    if (emojiMatch) {
      setSelectedEmoji(emojiMatch[0]);
      setTabName(value.substring(emojiMatch[0].length).trimStart());
    } else {
      setSelectedEmoji('');
      setTabName(value);
    }
  };

  const handleSubmit = () => {
    const finalTabName = tabName.trim();
    if (finalTabName && !isDuplicate) { // Only create if not empty and not a duplicate
      const finalEmoji = selectedEmoji || '';
      onCreate(finalTabName, finalEmoji);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          width: '400px',
          maxWidth: '90%',
          position: 'relative',
        }}
      >
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#333' }}>Create Custom Tab</h2>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#777',
          }}
        >
          &times;
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <input
            type="text"
            placeholder="Type name here..."
            value={selectedEmoji ? `${selectedEmoji} ${tabName}` : tabName}
            onChange={handleInputChange}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              border: '1px solid #ddd',
              fontSize: '1rem',
              boxSizing: 'border-box',
            }}
          />
          {isDuplicate && tabName.trim() && ( // Show message only if input has text and is duplicate
            <p style={{ color: 'red', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              This tab already exists!
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
          {suggestedTags.map((tag, index) => {
            const isTagAlreadyExisting = isTabExisting(tag.label);
            return (
              <button
                key={index}
                onClick={() => handleTagClick(tag.emoji, tag.label)}
                disabled={isTagAlreadyExisting} // Disable if tag exists
                style={{
                  ...tagButtonStyle,
                  opacity: isTagAlreadyExisting ? 0.6 : 1, // Make dull
                  cursor: isTagAlreadyExisting ? 'not-allowed' : 'pointer',
                }}
              >
                {tag.emoji} {tag.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!tabName.trim() || isDuplicate} // Disable if empty or duplicate
          style={{
            width: '100%',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            backgroundColor: (tabName.trim() && !isDuplicate) ? '#10B981' : '#E5E7EB',
            color: 'white',
            border: 'none',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: (tabName.trim() && !isDuplicate) ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s ease',
          }}
        >
          Create
        </button>

        <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.875rem', color: '#666' }}>
          <img src="https://www.cooby.co/favicon.ico" alt="Whatsopify Logo" style={{ height: '20px', verticalAlign: 'middle', marginRight: '5px' }} />
          Whatsopify
          <span style={{ marginLeft: '1rem', marginRight: '1rem' }}>|</span>
          Any questions? <a href="#" style={{ color: '#2563EB', textDecoration: 'none' }}>Contact support</a>
        </div>
      </div>
    </div>
  );
};

const tagButtonStyle = {
  padding: '6px 12px',
  borderRadius: '20px',
  border: '1px solid #ddd',
  backgroundColor: '#f9f9f9',
  fontSize: '0.875rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

export default CreateCustomTabModal;