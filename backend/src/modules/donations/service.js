import { query } from '../../db/pool.js';
import { ApiError } from '../../utils/ApiError.js';
import { generateCsv } from '../../utils/csv.js';
import { toDonationDto } from './dto.js';

export async function createDonation(data, currentUser) {
  if (currentUser.role === 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admins cannot create dummy donations');
  }

  const { amount, purpose, message, isAnonymous } = data;

  const sql = `
    INSERT INTO donations (user_id, amount, purpose, message, is_anonymous, is_demo)
    VALUES ($1, $2, $3, $4, $5, true)
    RETURNING *, (SELECT name FROM users WHERE id = $1) as donor_name
  `;

  const { rows } = await query(sql, [currentUser.id, amount, purpose, message || null, Boolean(isAnonymous)]);
  return toDonationDto(rows[0], currentUser);
}

export async function getDonations(queryData, currentUser) {
  if (currentUser.role === 'admin') {
    // Admin view: all donations with donor real names
    const page = Math.max(1, Number(queryData.page || 1));
    const limit = Math.min(100, Math.max(1, Number(queryData.limit || 20)));
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (queryData.purpose) {
      params.push(queryData.purpose);
      whereClause += ` AND d.purpose = $${params.length}`;
    }

    if (queryData.from) {
      params.push(queryData.from);
      whereClause += ` AND d.created_at >= $${params.length}`;
    }

    if (queryData.to) {
      params.push(queryData.to);
      whereClause += ` AND d.created_at <= $${params.length}`;
    }

    const countSql = `SELECT COUNT(*)::int as total, COALESCE(SUM(amount), 0)::numeric as "totalAmount" FROM donations d ${whereClause}`;
    const countRes = await query(countSql, params);
    const total = countRes.rows[0].total;
    const totalAmount = Number(countRes.rows[0].totalAmount);

    const dataParams = [...params, limit, offset];
    const dataSql = `
      SELECT d.*, u.name as donor_name
      FROM donations d
      JOIN users u ON d.user_id = u.id
      ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const dataRes = await query(dataSql, dataParams);
    const items = dataRes.rows.map(r => toDonationDto(r, currentUser));

    return { items, total, totalAmount, page, limit };
  }

  // Non-admin view: plain array of own donations
  const sql = `
    SELECT d.*, u.name as donor_name
    FROM donations d
    JOIN users u ON d.user_id = u.id
    WHERE d.user_id = $1
    ORDER BY d.created_at DESC
  `;

  const { rows } = await query(sql, [currentUser.id]);
  return rows.map(r => toDonationDto(r, currentUser));
}

export async function getDonationsSummary() {
  const funds = ['General Fund', 'Scholarship Fund', 'Emergency Fund'];
  const sql = `
    SELECT 
      purpose,
      COALESCE(SUM(amount), 0)::numeric as "totalAmount",
      COUNT(DISTINCT user_id)::int as "donorCount"
    FROM donations
    GROUP BY purpose
  `;

  const { rows } = await query(sql);
  const map = new Map(rows.map(r => [r.purpose, r]));

  return funds.map(purpose => {
    const item = map.get(purpose);
    return {
      purpose,
      totalAmount: item ? Number(item.totalAmount) : 0,
      donorCount: item ? Number(item.donorCount) : 0
    };
  });
}

export async function exportDonationsCsvAdmin(currentUser) {
  if (currentUser.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Only admins can export donations CSV');
  }

  const sql = `
    SELECT 
      d.id,
      u.name as "donorName",
      u.email as "donorEmail",
      d.amount,
      d.purpose,
      d.is_anonymous as "isAnonymous",
      d.created_at as "createdAt"
    FROM donations d
    JOIN users u ON d.user_id = u.id
    ORDER BY d.created_at DESC
  `;

  const { rows } = await query(sql);
  const headers = [
    { key: 'id', label: 'Donation ID' },
    { key: 'donorName', label: 'Donor Name' },
    { key: 'donorEmail', label: 'Donor Email' },
    { key: 'amount', label: 'Amount (BDT)' },
    { key: 'purpose', label: 'Fund Purpose' },
    { key: 'isAnonymous', label: 'Is Anonymous' },
    { key: 'createdAt', label: 'Created At' }
  ];

  return generateCsv(headers, rows);
}
