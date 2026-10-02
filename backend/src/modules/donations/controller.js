import { createDonation, exportDonationsCsvAdmin, getDonations, getDonationsSummary } from './service.js';

export async function handleCreateDonation(req, res) {
  const donation = await createDonation(req.body, req.user);
  res.status(201).json(donation);
}

export async function handleGetDonations(req, res) {
  const result = await getDonations(req.query, req.user);
  res.status(200).json(result);
}

export async function handleGetDonationsSummary(req, res) {
  const summary = await getDonationsSummary();
  res.status(200).json(summary);
}

export async function handleExportDonationsCsv(req, res) {
  const csv = await exportDonationsCsvAdmin(req.user);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=donations-report.csv');
  res.status(200).send(csv);
}
