import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx"; // For parsing Excel files
import Papa from "papaparse"; // For parsing CSV files

const LOCAL_STORAGE_KEY = "whatsappImportedContacts";

const InjectedSidebarButtons = () => {
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [showImportPopup, setShowImportPopup] = useState(false);
  const [showContactsList, setShowContactsList] = useState(false); // New state for contacts list
  const [phoneNumber, setPhoneNumber] = useState("");
  const [importedContacts, setImportedContacts] = useState([]); // To store processed contacts

  // Load contacts from local storage on component mount
  useEffect(() => {
    console.log(
      "📌 InjectedSidebarButtons mounted exactly like WhatsApp style"
    );
    const storedContacts = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedContacts) {
      setImportedContacts(JSON.parse(storedContacts));
    }
  }, []);

  // Update local storage whenever importedContacts changes
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(importedContacts));
  }, [importedContacts]);

  // WhatsApp button classes (unchanged)
  const whatsappButtonClasses =
    "xjb2p0i xk390pu x1heor9g x1ypdohk xjbqb8w x972fbf x10w94by x1qhh985 x14e42zd x1fmog5m xu25z0z x140muxe xo1y3bh xtnn1bt x9v5kkp xmw7ebm xrdum7p xh8yej3 x1y1aw1k xf159sx xwib8y2 xmzvs34";
  const whatsappDivClasses =
    "x1c4vz4f xs83m0k xdl72j9 x1g77sc7 x78zum5 xozqiw3 x1oa3qoh x12fk4p8 xeuugli x2lwn1j x1nhvcw1 x1q0g3np x6s0dn4 xh8yej3";
  const whatsappInnerDivClasses =
    "x1c4vz4f xs83m0k xdl72j9 x1g77sc7 x78zum5 xozqiw3 x1oa3qoh x12fk4p8 xeuugli x2lwn1j x1nhvcw1 x1q0g3np x6s0dn4 x1n2onr6";
  const whatsappIconColor = "#54656f";

  // Chat Pop-up Handlers (unchanged)
  const handleStartChatClick = () => {
    setShowChatPopup(true);
  };

  const handleCloseChatPopup = () => {
    setShowChatPopup(false);
    setPhoneNumber("");
  };

  const handlePhoneNumberChange = (event) => {
    setPhoneNumber(event.target.value);
  };

  const initiateWhatsAppChat = (numberToChat) => {
    const cleanedNumber = numberToChat.replace(/[^0-9]/g, "");
    if (cleanedNumber) {
      window.location.href = `https://web.whatsapp.com/send?phone=${cleanedNumber}`;
      handleCloseChatPopup();
    } else {
      alert("Invalid phone number to start a chat.");
    }
  };

  // Import Pop-up Handlers
  const handleImportClick = () => {
    setShowImportPopup(true);
  };

  const handleCloseImportPopup = () => {
    setShowImportPopup(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileName = file.name;
      const fileExtension = fileName.split(".").pop().toLowerCase();

      if (fileExtension === "csv") {
        parseCsvFile(file);
      } else if (fileExtension === "xlsx") {
        parseXlsxFile(file);
      } else {
        alert("Please select a .csv or .xlsx file.");
        event.target.value = null; // Clear the file input
      }
    }
  };

  const parseCsvFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const newContacts = results.data
          .map((row) => ({
            name: row.Name || row.name || "",
            number: row.Number || row.number || "",
          }))
          .filter((contact) => contact.number);
        setImportedContacts((prevContacts) => {
          // Merge new contacts with existing, preventing duplicates based on number
          const existingNumbers = new Set(prevContacts.map((c) => c.number));
          const uniqueNewContacts = newContacts.filter(
            (c) => !existingNumbers.has(c.number)
          );
          return [...prevContacts, ...uniqueNewContacts];
        });
        alert(
          `Successfully imported ${newContacts.length} new contacts from CSV!`
        );
        handleCloseImportPopup();
      },
      error: (error) => {
        alert("Error parsing CSV file: " + error.message);
        console.error("CSV Parse Error:", error);
      },
    });
  };

  const parseXlsxFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length === 0) {
          alert("Excel file is empty or has no data.");
          return;
        }

        const headers = json[0];
        const numberColIndex = headers.findIndex(
          (h) => typeof h === "string" && h.toLowerCase().includes("number")
        );
        const nameColIndex = headers.findIndex(
          (h) => typeof h === "string" && h.toLowerCase().includes("name")
        );

        if (numberColIndex === -1) {
          alert("Could not find a 'Number' column in the Excel file.");
          return;
        }

        const newContacts = json
          .slice(1)
          .map((row) => ({
            name: nameColIndex !== -1 ? row[nameColIndex] || "" : "",
            number: row[numberColIndex]
              ? String(row[numberColIndex]).replace(/[^0-9]/g, "")
              : "",
          }))
          .filter((contact) => contact.number);

        setImportedContacts((prevContacts) => {
          const existingNumbers = new Set(prevContacts.map((c) => c.number));
          const uniqueNewContacts = newContacts.filter(
            (c) => !existingNumbers.has(c.number)
          );
          return [...prevContacts, ...uniqueNewContacts];
        });
        alert(
          `Successfully imported ${newContacts.length} new contacts from XLSX!`
        );
        handleCloseImportPopup();
      } catch (error) {
        alert("Error parsing XLSX file: " + error.message);
        console.error("XLSX Parse Error:", error);
      }
    };
    reader.onerror = (error) => {
      alert("Error reading XLSX file: " + error);
      console.error("XLSX Read Error:", error);
    };
    reader.readAsArrayBuffer(file);
  };

  // Contacts List Handlers
  const handleShowContactsList = () => {
    setShowContactsList(true);
  };

  const handleCloseContactsList = () => {
    setShowContactsList(false);
  };

  const handleDeleteContact = (indexToDelete) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      setImportedContacts((prevContacts) =>
        prevContacts.filter((_, index) => index !== indexToDelete)
      );
    }
  };

  const handleStartChatFromList = (contactNumber) => {
    initiateWhatsAppChat(contactNumber);
    handleCloseContactsList(); // Close the list popup after initiating chat
  };

  return (
    <>
      <button
        aria-pressed="false"
        aria-label="Import"
        tabIndex="-1"
        data-navbar-item="true"
        className={whatsappButtonClasses}
        title="Import Contacts (CSV/XLSX)"
        onClick={handleImportClick}
      >
        <div className={whatsappDivClasses}>
          <div className={whatsappInnerDivClasses} style={{ flexGrow: 1 }}>
            <div>
              <span aria-hidden="true" data-icon="custom-import" className="">
                <svg
                  viewBox="0 0 24 24"
                  height="24"
                  width="24"
                  preserveAspectRatio="xMidYMid meet"
                  className=""
                  fill="none"
                >
                  <title>Import</title>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM11 7V10H8L12 14L16 10H13V7H11Z"
                    fill={whatsappIconColor}
                  ></path>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </button>

      <button
        aria-pressed="false"
        aria-label="Show Imported Contacts"
        tabIndex="-1"
        data-navbar-item="true"
        className={whatsappButtonClasses}
        title="Show Imported Contacts"
        onClick={handleShowContactsList}
      >
        <div className={whatsappDivClasses}>
          <div className={whatsappInnerDivClasses} style={{ flexGrow: 1 }}>
            <div>
              <span
                aria-hidden="true"
                data-icon="custom-contact-list"
                className=""
              >
                {/* This SVG is a placeholder, you might want a different icon for list/contacts */}
                <svg
                  viewBox="0 0 24 24"
                  height="24"
                  width="24"
                  preserveAspectRatio="xMidYMid meet"
                  className=""
                  fill="none"
                >
                  <title>Show Imported Contacts</title>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3 5H21V7H3V5ZM3 9H21V11H3V9ZM3 13H21V15H3V13ZM3 17H21V19H3V17Z"
                    fill={whatsappIconColor}
                  ></path>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </button>

      <button
        aria-pressed="false"
        aria-label="Start chat with unsaved contact"
        tabIndex="-1"
        data-navbar-item="true"
        className={whatsappButtonClasses}
        title="Start chat with unsaved contact"
        onClick={handleStartChatClick}
      >
        <div className={whatsappDivClasses}>
          <div className={whatsappInnerDivClasses} style={{ flexGrow: 1 }}>
            <div>
              <span
                aria-hidden="true"
                data-icon="custom-user-plus"
                className=""
              >
                <svg
                  viewBox="0 0 24 24"
                  height="24"
                  width="24"
                  preserveAspectRatio="xMidYMid meet"
                  className=""
                  fill="none"
                >
                  <title>Start chat with unsaved contact</title>
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M16 16C16 14.9 14.8954 14 13.5 14H10.5C9.10457 14 8 14.9 8 16V17H16V16ZM12 6C13.6569 6 15 7.34315 15 9C15 10.6569 13.6569 12 12 12C10.3431 12 9 10.6569 9 9C9 7.34315 10.3431 6 12 6ZM12 4C9.23858 4 7 6.23858 7 9C7 11.7614 9.23858 14 12 14C14.7614 14 17 11.7614 17 9C17 6.23858 14.7614 4 12 4ZM18 16V17C18 17.5523 17.5523 18 17 18H7C6.44772 18 6 17.5523 6 17V16C6 14.07 7.57 12.5 9.5 12.5H14.5C16.43 12.5 18 14.07 18 16ZM20 9H22V11H20V9ZM20 12H22V14H20V12Z"
                    fill={whatsappIconColor}
                  ></path>
                </svg>
              </span>
            </div>
          </div>
        </div>
      </button>

      {showChatPopup && (
        <div style={popupOverlayStyle}>
          <div style={popupContentStyle}>
            <h2>Start Chat with Unsaved Contact</h2>
            <p>
              Enter the phone number (including country code, e.g., 923001234567
              for Pakistan):
            </p>
            <input
              type="text"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              placeholder="e.g., 923001234567"
              style={inputStyle}
            />
            <div style={buttonContainerStyle}>
              <button
                onClick={() => initiateWhatsAppChat(phoneNumber)}
                style={{ ...buttonStyle, backgroundColor: "#25D366" }}
              >
                Start Chat
              </button>
              <button
                onClick={handleCloseChatPopup}
                style={{ ...buttonStyle, backgroundColor: "#FF6347" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportPopup && (
        <div style={popupOverlayStyle}>
          <div style={popupContentStyle}>
            <h2>Import Contacts</h2>
            <p>Upload a .xlsx or .csv file with 'Number' and 'Name' columns.</p>
            <input
              type="file"
              accept=".csv, .xlsx"
              onChange={handleFileChange}
              style={fileInputStyle}
            />
            <div style={buttonContainerStyle}>
              <button
                onClick={handleCloseImportPopup}
                style={{ ...buttonStyle, backgroundColor: "#FF6347" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactsList && (
        <div style={popupOverlayStyle}>
          <div style={{ ...popupContentStyle, maxWidth: "400px" }}>
            <h2>Imported Contacts</h2>
            {importedContacts.length > 0 ? (
              <ul style={contactsListStyle}>
                {importedContacts.map((contact, index) => (
                  <li key={index} style={contactListItemStyle}>
                    <div>
                      <strong>{contact.name || "N/A"}</strong>
                      <br />
                      <span>{contact.number}</span>
                    </div>
                    <div style={contactListButtonContainer}>
                      <button
                        onClick={() => handleStartChatFromList(contact.number)}
                        style={{
                          ...buttonStyle,
                          backgroundColor: "#25D366",
                          marginRight: "5px",
                          padding: "5px 10px",
                          fontSize: "14px",
                        }}
                      >
                        Chat
                      </button>
                      <button
                        onClick={() => handleDeleteContact(index)}
                        style={{
                          ...buttonStyle,
                          backgroundColor: "#FF6347",
                          padding: "5px 10px",
                          fontSize: "14px",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No contacts imported yet.</p>
            )}
            <div style={buttonContainerStyle}>
              <button
                onClick={handleCloseContactsList}
                style={{ ...buttonStyle, backgroundColor: "#607D8B" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const popupOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const popupContentStyle = {
  backgroundColor: "#fff",
  padding: "20px",
  borderRadius: "8px",
  boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
  textAlign: "center",
  width: "300px",
  color: "#333",
};

const inputStyle = {
  width: "calc(100% - 20px)",
  padding: "10px",
  margin: "10px 0",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "16px",
};

const fileInputStyle = {
  marginTop: "15px",
  marginBottom: "15px",
  display: "block",
  margin: "15px auto",
};

const buttonContainerStyle = {
  display: "flex",
  justifyContent: "space-around",
  marginTop: "20px",
};

const buttonStyle = {
  padding: "10px 20px",
  border: "none",
  borderRadius: "5px",
  color: "white",
  cursor: "pointer",
  fontSize: "16px",
};

// Styles for the new contacts list popup
const contactsListStyle = {
  listStyle: "none",
  padding: 0,
  margin: "15px 0",
  maxHeight: "300px", // Make list scrollable if many contacts
  overflowY: "auto",
  border: "1px solid #eee",
  borderRadius: "4px",
  backgroundColor: "#f9f9f9",
};

const contactListItemStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 15px",
  borderBottom: "1px solid #eee",
  textAlign: "left",
};

const contactListButtonContainer = {
  display: "flex",
  gap: "5px",
};

export default InjectedSidebarButtons;
