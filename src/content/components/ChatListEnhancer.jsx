import React, { useEffect } from 'react';
import './ChatListEnhancer.css';

// const icons = [
//   {
//     label: 'Mark as done',
//     svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.285 2.859l1.415 1.414-13.99 13.99-6.708-6.707 1.414-1.414 5.294 5.294z"/></svg>`,
//     color: 'purple'
//   },
//   {
//     label: 'Snooze',
//     svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm1-10h4v2h-6V7h2v5z"/></svg>`,
//     color: '#e91e63'
//   },
//   {
//     label: 'Archive',
//     svg: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.39A2 2 0 0 0 17.17 3H6.83a2 2 0 0 0-1.98 1.84l-1.39 1.39A2 2 0 0 0 3 6.91V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.91a2 2 0 0 0-.46-1.68zM12 17l-5-5h3V9h4v3h3l-5 5z"/></svg>`,
//     color: '#6c63ff'
//   }
// ];

// function getStarSvg(filled) {
//   return `
//     <svg width="16" height="16" viewBox="0 0 24 24" fill="${filled ? 'gold' : 'none'}" 
//          stroke="${filled ? 'gold' : 'currentColor'}" stroke-width="1.5">
//       <path d="M12 18.26l-7.053 3.948 1.575-7.928L.587 8.792l8.027-.952L12 .5l3.386 7.34 8.027.952-5.935 5.488 1.575 7.928L12 18.26z"/>
//     </svg>
//   `;
// }

// function injectStarIcon(chatNode, starredChats) {
//   if (chatNode.querySelector('.whatsopify-star-btn')) return;

//   const nameSpan = chatNode.querySelector('span[title][dir="auto"]');
//   if (!nameSpan) return;

//   const chatName = nameSpan.textContent;
//   const isStarred = starredChats?.includes(chatName);

//   const starBtn = document.createElement('button');
//   starBtn.className = 'whatsopify-star-btn';
//   starBtn.innerHTML = getStarSvg(isStarred);
//   starBtn.title = 'Add to Favorites';
//   starBtn.dataset.filled = isStarred;

//   starBtn.addEventListener('click', (e) => {
//     e.preventDefault();
//     e.stopPropagation();

//     const nowFilled = !(starBtn.dataset.filled === 'true');
//     starBtn.innerHTML = getStarSvg(nowFilled);
//     starBtn.dataset.filled = nowFilled;

//     chrome.storage.local.get(['starredChats'], (res) => {
//       const current = res.starredChats || [];
//       const updated = nowFilled
//         ? [...new Set([...current, chatName])]
//         : current.filter(name => name !== chatName);

//       chrome.storage.local.set({ starredChats: updated });
//     });
//   });

//   nameSpan.parentNode.insertBefore(starBtn, nameSpan);
// }

// function injectIcons(chatNode) {
//   if (chatNode.querySelector('.whatsopify-action-buttons')) return;

//   const iconContainer = document.createElement('div');
//   iconContainer.className = 'whatsopify-action-buttons';
//   iconContainer.style.setProperty('--icon-count', icons.length);

//   icons.forEach(({ label, svg, color }) => {
//     const btn = document.createElement('button');
//     btn.className = 'whatsopify-action-btn';
//     btn.innerHTML = svg;
//     btn.title = label;
//     btn.style.color = color;
//     iconContainer.appendChild(btn);
//   });

//   const targetParent = chatNode.querySelector('._ak8j') || chatNode;
//   targetParent.appendChild(iconContainer);
// }

const ChatListEnhancer = () => {
  useEffect(() => {
    const processChats = (starredChats = []) => {
      const chatItems = document.querySelectorAll('[role="listitem"]');
      chatItems.forEach(chat => {
        injectStarIcon(chat, starredChats);
        injectIcons(chat);
      });
    };

    // Load starred chats from chrome.storage on startup
    chrome.storage.local.get(['starredChats'], (res) => {
      const starredChats = res.starredChats || [];
      processChats(starredChats);

      const observer = new MutationObserver((mutations) => {
        if (mutations.some(m => m.addedNodes.length > 0)) {
          processChats(starredChats);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      return () => observer.disconnect();
    });
  }, []);

  return null;
};

export default ChatListEnhancer;
