"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Modal, Button } from "@heroui/react";
import { CheckCircle2, AlertCircle, Info, XCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type NotificationType = "success" | "error" | "info" | "warning" | "loading";

interface NotificationModalOptions {
  title: string;
  message: string;
  type?: NotificationType;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  showCloseButton?: boolean;
}

interface NotificationContextType {
  showNotification: (options: NotificationModalOptions) => void;
  closeNotification: () => void;
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
      case "success": return <CheckCircle2 className="text-success shadow-[0_0_15px_rgba(34,197,94,0.3)]" size={32} />;
      case "error": return <XCircle className="text-danger shadow-[0_0_15px_rgba(239,68,68,0.3)]" size={32} />;
      case "warning": return <AlertCircle className="text-warning shadow-[0_0_15px_rgba(245,158,11,0.3)]" size={32} />;
      case "loading": return <Loader2 className="text-primary animate-spin" size={32} />;
      default: return <Info className="text-primary shadow-[0_0_15px_rgba(37,99,235,0.3)]" size={32} />;
    }
  };

  return (
    <NotificationContext.Provider value={{ showNotification, closeNotification }}>
      {children}
      
      <AnimatePresence>
        {isOpen && options && (
          <Modal 
            isOpen={isOpen} 
            onOpenChange={(open) => setIsOpen(open)}
          >
            <Modal.Dialog className="glass rounded-[2rem] border border-white/10 p-1 overflow-hidden outline-none bg-black/40 backdrop-blur-3xl shadow-2xl relative z-[999]">
              <div className="p-8 flex flex-col items-center text-center gap-6">
                <motion.div 
                   initial={{ scale: 0.5, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="mb-2"
                >
                  {getIcon()}
                </motion.div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-black tracking-tight text-white">{options.title}</h2>
                  <p className="text-default-400 font-medium leading-relaxed max-w-xs">{options.message}</p>
                </div>

                <div className="flex gap-3 w-full mt-4">
                  {options.showCloseButton !== false && (
                    <Button 
                      variant="ghost" 
                      onPress={closeNotification}
                      className="flex-1 h-12 font-bold border-white/5 hover:bg-white/5 transition-colors"
                    >
                      Dismiss
                    </Button>
                  )}
                  {options.onPrimaryAction && (
                    <Button 
                      variant="primary" 
                      className="flex-1 h-12 font-black tracking-wide shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                      onPress={() => {
                        options.onPrimaryAction?.();
                        if (options.type !== 'loading') closeNotification();
                      }}
                    >
                      {options.primaryActionLabel || "Confirm"}
                    </Button>
                  )}
                </div>
              </div>
            </Modal.Dialog>
          </Modal>
        )}
      </AnimatePresence>
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
