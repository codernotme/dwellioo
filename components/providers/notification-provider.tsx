"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Modal, Button } from "@heroui/react";
import { CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";

type NotificationType = "success" | "error" | "info" | "warning";

interface NotificationModalOptions {
  title: string;
  message: string;
  type?: NotificationType;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

interface NotificationContextType {
  showNotification: (options: NotificationModalOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<NotificationModalOptions | null>(null);

  const showNotification = (newOptions: NotificationModalOptions) => {
    setOptions(newOptions);
    setIsOpen(true);
  };

  const closeNotification = () => {
    setIsOpen(false);
  };

  const getIcon = () => {
    switch (options?.type) {
      case "success": return <CheckCircle2 className="text-success" size={24} />;
      case "error": return <XCircle className="text-danger" size={24} />;
      case "warning": return <AlertCircle className="text-warning" size={24} />;
      default: return <Info className="text-primary" size={24} />;
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {options && (
        <Modal 
          isOpen={isOpen} 
          onOpenChange={(open) => setIsOpen(open)}
        >
          <Modal.Dialog>
            <Modal.Header>
              <div className="flex gap-3 items-center">
                {getIcon()}
                <Modal.Heading>{options.title}</Modal.Heading>
              </div>
            </Modal.Header>
            <Modal.Body>
              <p className="text-default-600">{options.message}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={closeNotification}>
                Close
              </Button>
              {options.onPrimaryAction && (
                <Button 
                  variant="primary" 
                  onPress={() => {
                    options.onPrimaryAction?.();
                    closeNotification();
                  }}
                >
                  {options.primaryActionLabel || "Confirm"}
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotificationModal() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationModal must be used within a NotificationProvider");
  }
  return context;
}
