import { createEvent, deleteEvent, exportEventRegistrationsCsv, getAllEvents, getEventById, getEventRegistrationsAdmin, registerForEvent, unregisterFromEvent, updateEvent } from './service.js';

export async function handleGetAllEvents(req, res) {
  const events = await getAllEvents(req.user);
  res.status(200).json(events);
}

export async function handleGetEventById(req, res) {
  const event = await getEventById(req.params.id, req.user);
  res.status(200).json(event);
}

export async function handleCreateEvent(req, res) {
  const event = await createEvent(req.body, req.user);
  res.status(201).json(event);
}

export async function handleUpdateEvent(req, res) {
  const event = await updateEvent(req.params.id, req.body, req.user);
  res.status(200).json(event);
}

export async function handleDeleteEvent(req, res) {
  const result = await deleteEvent(req.params.id, req.user);
  res.status(200).json(result);
}

export async function handleRegisterEvent(req, res) {
  const event = await registerForEvent(req.params.id, req.user);
  res.status(201).json(event);
}

export async function handleUnregisterEvent(req, res) {
  const result = await unregisterFromEvent(req.params.id, req.user);
  res.status(200).json(result);
}

export async function handleGetRegistrationsAdmin(req, res) {
  const data = await getEventRegistrationsAdmin(req.params.id, req.user);
  res.status(200).json(data);
}

export async function handleExportRegistrationsCsv(req, res) {
  const csv = await exportEventRegistrationsCsv(req.params.id, req.user);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=event-${req.params.id}-registrations.csv`);
  res.status(200).send(csv);
}
