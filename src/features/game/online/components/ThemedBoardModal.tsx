"use client";

import React from "react";

interface ThemedBoardModalProps {
  headerText?: string;
  headerType?: "default" | "success";
  title?: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function ThemedBoardModal({
  headerText,
  headerType = "default",
  title,
  description,
  children,
  actions,
  className = "",
}: ThemedBoardModalProps) {
  return (
    <div className={`themed-board-modal animate-fade-in ${className}`}>
      {headerText && (
        <div className={`modal-header-text ${headerType === "success" ? "success" : ""}`}>
          {headerText}
        </div>
      )}
      
      {title && <h2 className="modal-title">{title}</h2>}
      
      {description && <p className="details-desc">{description}</p>}
      
      {children}
      
      {actions && <div className="modal-actions">{actions}</div>}
    </div>
  );
}
