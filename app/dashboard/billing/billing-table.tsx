"use client";

import { Table, Chip, Button } from "@heroui/react";
import { MoreVertical, Clock } from "lucide-react";
import { useNotificationModal } from "@/components/providers/notification-provider";

export function BillingTable({ dues }: { dues: any[] }) {
  const { showNotification } = useNotificationModal();

  const statusColorMap: Record<string, "success" | "warning" | "danger" | "default" | "primary" | "secondary"> = {
    Paid: "success",
    Pending: "warning",
    Overdue: "danger",
    Partial: "primary",
    Waived: "default",
  };

  const handlePayment = (due: any) => {
    showNotification({
      title: "Confirm Payment",
      message: `You are about to pay ₹ ${(due.amount_paise / 100).toLocaleString()} for ${new Date(0, due.month - 1).toLocaleString('default', { month: 'long' })} ${due.year}.`,
      type: "info",
      primaryActionLabel: "Pay Now",
      onPrimaryAction: () => {
        showNotification({
          title: "Payment Successful",
          message: "Your payment has been processed successfully. A receipt has been sent to your email.",
          type: "success"
        });
      }
    });
  };

  return (
    <Table aria-label="Maintenance dues" className="bg-background rounded-large shadow-sm">
      <Table.ScrollContainer>
        <Table.Content>
          <Table.Header>
            <Table.Column>PERIOD</Table.Column>
            <Table.Column>UNIT / RESIDENT</Table.Column>
            <Table.Column>AMOUNT</Table.Column>
            <Table.Column>DUE DATE</Table.Column>
            <Table.Column>STATUS</Table.Column>
            <Table.Column>ACTION</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={() => "No billing records found."}>
            {dues.map((due) => (
              <Table.Row key={due.id}>
                <Table.Cell>
                   <span className="font-bold text-sm">
                      {new Date(0, due.month - 1).toLocaleString('default', { month: 'short' })} {due.year}
                   </span>
                </Table.Cell>
                <Table.Cell>
                   <div className="flex flex-col">
                      <span className="font-semibold text-sm">Unit {due.units?.unit_number}</span>
                      <span className="text-xs text-default-400">{due.residents?.profiles?.full_name}</span>
                   </div>
                </Table.Cell>
                <Table.Cell>
                   <span className="font-black text-sm">₹ {(due.amount_paise / 100).toLocaleString()}</span>
                </Table.Cell>
                <Table.Cell>
                   <span className="text-xs font-semibold text-default-500">
                      {new Date(due.due_date).toLocaleDateString()}
                   </span>
                </Table.Cell>
                <Table.Cell>
                   <Chip size="sm" variant="soft" color={(statusColorMap[due.status] as any) || "default"} className="font-bold">
                      {due.status}
                   </Chip>
                </Table.Cell>
                <Table.Cell>
                   {due.status === 'Pending' || due.status === 'Overdue' ? (
                      <Button size="sm" variant="primary" className="font-extrabold h-8" onPress={() => handlePayment(due)}>
                        PAY
                      </Button>
                   ) : (
                      <Button variant="ghost" size="sm" className="h-8 w-8 min-w-0 p-0">
                        <MoreVertical size={16} />
                      </Button>
                   )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
