const GST_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh', taxType: 'UTGST' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', taxType: 'UTGST' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep', taxType: 'UTGST' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands', taxType: 'UTGST' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh', taxType: 'UTGST' },
  { code: '96', name: 'Foreign Country', taxType: 'IGST' },
  { code: '97', name: 'Other Territory', taxType: 'UTGST' },
];

const normalize = (value = '') => String(value).trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ');

const aliases = new Map([
  ['jammu kashmir', 'Jammu and Kashmir'],
  ['orissa', 'Odisha'],
  ['pondicherry', 'Puducherry'],
  ['andaman nicobar islands', 'Andaman and Nicobar Islands'],
  ['dadra nagar haveli daman diu', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['dadra and nagar haveli', 'Dadra and Nagar Haveli and Daman and Diu'],
  ['daman and diu', 'Dadra and Nagar Haveli and Daman and Diu'],
]);

const GST_STATE_BY_CODE = Object.fromEntries(GST_STATES.map((state) => [state.code, state.name]));

const getGstState = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const byCode = GST_STATES.find((state) => state.code === raw.padStart(2, '0'));
  if (byCode) return byCode;
  const normalized = normalize(raw);
  const alias = aliases.get(normalized);
  return GST_STATES.find((state) => normalize(state.name) === normalized || state.name === alias) || null;
};

const getGstStateFromGstin = (gstin = '') => getGstState(String(gstin).trim().slice(0, 2));
const isUnionTerritoryGstState = (value = '') => getGstState(value)?.taxType === 'UTGST';

const getGstTaxType = (companyState = '', placeOfSupply = '') => {
  const company = getGstState(companyState);
  const supply = getGstState(placeOfSupply);
  if (!company || !supply) return 'SGST';
  if (supply.taxType === 'IGST' || company.code !== supply.code) return 'IGST';
  return supply.taxType === 'UTGST' ? 'UTGST' : 'SGST';
};

module.exports = {
  GST_STATE_BY_CODE,
  GST_STATES,
  getGstState,
  getGstStateFromGstin,
  getGstTaxType,
  isUnionTerritoryGstState,
};
