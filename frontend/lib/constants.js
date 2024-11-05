export const ItemStatus = {
  LOST: 'lost',
  FOUND: 'found',
  IN_VERIFICATION: 'in_verification',
  PENDING_RETRIEVAL: 'pending_retrieval',
  HANDED_OVER: 'handed_over'
};

export const ItemStatusLabels = {
  [ItemStatus.LOST]: 'Lost',
  [ItemStatus.FOUND]: 'Found',
  [ItemStatus.IN_VERIFICATION]: 'In Verification',
  [ItemStatus.PENDING_RETRIEVAL]: 'Pending Retrieval',
  [ItemStatus.HANDED_OVER]: 'Handed Over'
};

export const ItemStatusVariants = {
  [ItemStatus.LOST]: 'destructive',
  [ItemStatus.FOUND]: 'secondary',
  [ItemStatus.IN_VERIFICATION]: 'warning',
  [ItemStatus.PENDING_RETRIEVAL]: 'warning',
  [ItemStatus.HANDED_OVER]: 'default'
}; 