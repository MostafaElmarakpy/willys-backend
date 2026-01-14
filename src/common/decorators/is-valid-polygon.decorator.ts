import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

export function IsValidPolygon(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isValidPolygon",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (!value || typeof value !== "object") {
            return false;
          }

          // Check if it's a proper GeoJSON Polygon
          if (value.type !== "Polygon") {
            return false;
          }

          if (
            !Array.isArray(value.coordinates) ||
            value.coordinates.length === 0
          ) {
            return false;
          }

          // Check each ring in the polygon
          for (const ring of value.coordinates) {
            if (!Array.isArray(ring) || ring.length < 4) {
              return false; // A ring must have at least 4 points (first and last must be the same)
            }

            // Check each coordinate pair in the ring
            for (const coord of ring) {
              if (!Array.isArray(coord) || coord.length !== 2) {
                return false; // Each coordinate must be [longitude, latitude]
              }

              const [longitude, latitude] = coord;

              if (
                typeof longitude !== "number" ||
                typeof latitude !== "number"
              ) {
                return false; // Coordinates must be numbers
              }

              // Validate longitude range
              if (longitude < -180 || longitude > 180) {
                return false;
              }

              // Validate latitude range
              if (latitude < -90 || latitude > 90) {
                return false;
              }
            }

            // Check if the ring is closed (first and last points are the same)
            const firstPoint = ring[0];
            const lastPoint = ring[ring.length - 1];
            if (
              firstPoint[0] !== lastPoint[0] ||
              firstPoint[1] !== lastPoint[1]
            ) {
              return false;
            }
          }

          return true;
        },
        defaultMessage(_args: ValidationArguments) {
          return "Polygon must be a valid GeoJSON Polygon with proper coordinate structure. Each ring must have at least 4 points, coordinates must be [longitude, latitude] format within valid ranges (-180 to 180 for longitude, -90 to 90 for latitude), and rings must be closed.";
        },
      },
    });
  };
}
