export = {
  errors: {
    tokenVerificationFailed: 'Token verification failed',
    internalError: 'Internal server error has occurred',
    missingBody: 'Missing body request',
  },
  info: {
    unavailableCrew: 'None of the crew are available',
    noPendingOrder: 'No pending order found',
    crewAssignInProgress: 'Crew assignment is in progress',
    crewPickupTask: (
      crewId: number, memberType: string, orderId: string
    ) => `Crew ${crewId} start picked up ${memberType} order ${orderId}`,
    setCrewAvailability: 'Set crew',
  },
  success: {
    successCreateOrder: (
      id: string, memberType: string, orderStatus: string, queue: number
    ) => `Created ${memberType} order ${id} (Queue no #${queue} - ${orderStatus})`,
    successProcessOrder: "Successfully process order for",
    successCreateCrew: (
      id: number, crewStatus: string
    ) => `Created crew ${id} with ${crewStatus} status`,
  },
};
