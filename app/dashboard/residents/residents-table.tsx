"use client";

import { Table, Chip } from "@heroui/react";

const statusColorMap: Record<string, "success" | "warning" | "danger" | "default"> = {
  Active: "success",
  Pending: "warning",
  Archived: "default",
};

export function ResidentsTable({ residents }: { residents: any[] }) {
  return (
    <Table aria-label="Residents Table" className="bg-background rounded-large shadow-sm">
      <Table.ScrollContainer>
        <Table.Content>
          <Table.Header>
            <Table.Column>RESIDENT</Table.Column>
            <Table.Column>CONTACT</Table.Column>
            <Table.Column>UNIT</Table.Column>
            <Table.Column>STATUS</Table.Column>
            <Table.Column>MOVE-IN DATE</Table.Column>
          </Table.Header>
          <Table.Body renderEmptyState={() => "No residents found."}>
            {residents.map((resident) => {
              const profile = resident.profiles;
              const unit = resident.units;

              return (
                <Table.Row key={resident.id}>
                  <Table.Cell>
                    <div className="flex items-center gap-3">
                       {profile?.avatar_url ? (
                          <img src={profile.avatar_url} className="w-8 h-8 rounded-lg" alt="avatar" />
                       ) : (
                          <div className="w-8 h-8 rounded-lg bg-default-200" />
                       )}
                       <div className="flex flex-col">
                         <span className="font-medium text-sm">{profile?.full_name || "Unknown User"}</span>
                         <span className="text-xs text-default-500">{profile?.email || "No email"}</span>
                       </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-col">
                      <span className="text-small">{profile?.phone || "N/A"}</span>
                    </div>
                  </Table.Cell>
                  <Table.Cell>{unit?.unit_number || "Unassigned"}</Table.Cell>
                  <Table.Cell>
                    <Chip
                      className="capitalize"
                      color={statusColorMap[resident.status] || "default"}
                      size="sm"
                      variant="soft"
                    >
                      {resident.status}
                    </Chip>
                  </Table.Cell>
                  <Table.Cell>
                    {resident.move_in_date 
                      ? new Date(resident.move_in_date).toLocaleDateString() 
                      : "Unknown"}
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  );
}
