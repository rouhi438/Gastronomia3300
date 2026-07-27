export const DELIVERY_FEE = 45;
export const MAX_DELIVERY_DISTANCE_KM = 10;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const RESTAURANT_COORDINATES: Coordinates = {
  latitude: 0,
  longitude: 0,
};

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceKm(
  origin: Coordinates,
  destination: Coordinates,
): number {
  const latitudeDifference = toRadians(destination.latitude - origin.latitude);

  const longitudeDifference = toRadians(
    destination.longitude - origin.longitude,
  );

  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function validateDeliveryDistance(customerCoordinates: Coordinates) {
  const distanceKm = calculateDistanceKm(
    RESTAURANT_COORDINATES,
    customerCoordinates,
  );

  return {
    distanceKm,
    isWithinDeliveryArea: distanceKm <= MAX_DELIVERY_DISTANCE_KM,
  };
}
