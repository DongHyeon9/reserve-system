-- A reservation's popup must be the popup its slot belongs to.
alter table slots add constraint slots_id_popup_unique unique (id, popup_id);
alter table reservations
    add constraint reservations_slot_popup_fk foreign key (slot_id, popup_id) references slots (id, popup_id);
