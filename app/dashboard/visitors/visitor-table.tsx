"use client";

import { Table, Chip, Button } from "@heroui/react";
import { User, Phone, MapPin, Clock, ArrowRight, MoreVertical } from "lucide-react";

export function VisitorTable({ visitors }: { visitors: any[] }) {
  const statusColorMap: Record<string, "success" | "warning" | "danger" | "default" | "primary" | "secondary"> = {
    Approved: "primary",
    Entered: "success",
    Exited: "default",
    Rejected: "danger",
    Pending: "warning",
    Expired: "default",
  };

  return (
    <Table aria-label="Visitor logs" className="bg-background rounded-large shadow-sm">
      <Table.ScrollContainer>
        <Table.Content>
          <Table.Header>
            <Table.Column>VISITOR</Table.Column>
            <Table.Column>UNIT</Table.Column>
            <Table.Column>PURPOSE</Table.Column>
            <Table.Column>STATUS</Table.Column>
            <Table.Column>ENTRY/EXIT</Table.Column>
            <Table.Column>ACTION</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={() => "No visitor logs found."}>
            {visitors.map((visitor) => (
              <Table.Row key={visitor.id}>
                <Table.Cell>
                   <div className="flex flex-col">
                      <span className="font-bold text-sm tracking-tight">{visitor.name}</span>
                      <span className="text-xs text-default-400 font-medium">{visitor.phone}</span>
                   </div>
                </Table.Cell>
                <Table.Cell>
                   <div className="flex flex-col">
                      <span className="font-semibold text-sm">{visitor.units?.unit_number || "Unassigned"}</span>
                      <span className="text-xs text-default-400">Res: {visitor.residents?.profiles?.full_name || "Unknown"}</span>
                   </div>
                </Table.Cell>
                <Table.Cell>
                   <span className="text-sm font-medium">{visitor.purpose || "General Visit"}</span>
                </Table.Cell>
                <Table.Cell>
                   <Chip size="sm" variant="soft" color={(statusColorMap[visitor.status] as any) || "default"} className="font-bold">
                      {visitor.status}
                   </Chip>
                </Table.Cell>
                <Table.Cell>
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                         <Clock size={12} />
                         {visitor.entry_time ? new Date(visitor.entry_time).toLocaleTimeString() : "Pending"}
                      </div>
                      {visitor.exit_time && (
                         <div className="flex items-center gap-1.5 text-xs font-semibold text-default-400">
                            <Clock size={12} />
                            {new Date(visitor.exit_time).toLocaleTimeString()}
                         </div>
                      )}
                   </div>
                </Table.Cell>
                <Table.Cell>
                   <Button variant="ghost" size="sm" isIconOnly>
                      <MoreVertical size={16} />
                   </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
