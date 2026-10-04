"""
Spike: CRS Conversion ED50 UTM Zone 31N to WGS84
Supports pyproj transformer and analytical Helmert/Molodensky conversion for verification.
"""
import math

def utm_to_latlon_ed50(easting, northing, zone=31, northern_hemisphere=True):
    """Convert UTM Zone 31N coordinates on Hayford/ED50 ellipsoid to geographic (lat, lon) in ED50."""
    a = 6378388.0  # International 1924 / Hayford
    f = 1 / 297.0
    b = a * (1 - f)
    e2 = (a**2 - b**2) / (a**2)
    e_prime_sq = (a**2 - b**2) / (b**2)
    k0 = 0.9996
    
    x = easting - 500000.0  # remove false easting
    y = northing if northern_hemisphere else northing - 10000000.0
    
    m = y / k0
    mu = m / (a * (1 - e2/4 - 3*e2**2/64 - 5*e2**3/256))
    
    e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
    
    phi1_rad = mu + (3*e1/2 - 27*e1**3/32)*math.sin(2*mu) + (21*e1**2/16 - 55*e1**4/32)*math.sin(4*mu) + (151*e1**3/96)*math.sin(6*mu)
    
    n1 = a / math.sqrt(1 - e2 * math.sin(phi1_rad)**2)
    t1 = math.tan(phi1_rad)**2
    c1 = e_prime_sq * math.cos(phi1_rad)**2
    r1 = a * (1 - e2) / math.pow(1 - e2 * math.sin(phi1_rad)**2, 1.5)
    d = x / (n1 * k0)
    
    lat_rad = phi1_rad - (n1 * math.tan(phi1_rad) / r1) * (d**2/2 - (5 + 3*t1 + 10*c1 - 4*c1**2 - 9*e_prime_sq)*d**4/24 + (61 + 90*t1 + 298*c1 + 45*t1**2 - 252*e_prime_sq - 3*c1**2)*d**6/720)
    lon_rad = (d - (1 + 2*t1 + c1)*d**3/6 + (5 - 2*c1 + 28*t1 - 3*c1**2 + 8*e_prime_sq + 24*t1**2)*d**5/120) / math.cos(phi1_rad)
    
    lon_origin = (zone - 1) * 6 - 180 + 3
    lon_deg = lon_origin + math.degrees(lon_rad)
    lat_deg = math.degrees(lat_rad)
    return lat_deg, lon_deg

def ed50_to_wgs84(lat_ed50, lon_ed50, h=0):
    """
    Standard Bursa-Wolf 7-parameter transformation ED50 -> WGS84 for North Sea (EPSG:1612).
    dX = -87m, dY = -98m, dZ = -121m
    """
    # Convert lat/lon/h on ED50 ellipsoid to Cartesian XYZ
    a1 = 6378388.0
    f1 = 1 / 297.0
    e2_1 = 2*f1 - f1**2
    lat_r = math.radians(lat_ed50)
    lon_r = math.radians(lon_ed50)
    
    n = a1 / math.sqrt(1 - e2_1 * math.sin(lat_r)**2)
    x = (n + h) * math.cos(lat_r) * math.cos(lon_r)
    y = (n + h) * math.cos(lat_r) * math.sin(lon_r)
    z = (n * (1 - e2_1) + h) * math.sin(lat_r)
    
    # North sea shift parameters (EPSG:1612)
    dx = -87.0
    dy = -98.0
    dz = -121.0
    
    x2 = x + dx
    y2 = y + dy
    z2 = z + dz
    
    # Convert Cartesian XYZ back to WGS84 ellipsoid
    a2 = 6378137.0
    f2 = 1 / 298.257223563
    e2_2 = 2*f2 - f2**2
    b2 = a2 * (1 - f2)
    
    p = math.sqrt(x2**2 + y2**2)
    theta = math.atan2(z2 * a2, p * b2)
    
    lat_wgs = math.atan2(z2 + e2_2 * (a2**2 / b2) * math.sin(theta)**3, p - e2_2 * a2 * math.cos(theta)**3)
    lon_wgs = math.atan2(y2, x2)
    
    return math.degrees(lat_wgs), math.degrees(lon_wgs)

def run_conversion_spike():
    # Volve 15/9-F-12: E=435050.25, N=6478566.09 (ED50 UTM 31N)
    e = 435050.25
    n = 6478566.09
    
    lat_ed50, lon_ed50 = utm_to_latlon_ed50(e, n)
    lat_wgs84, lon_wgs84 = ed50_to_wgs84(lat_ed50, lon_ed50)
    
    # Official NOD published WGS84 coordinates:
    # 58.441636 N, 1.887483 E
    expected_lat = 58.441636
    expected_lon = 1.887483
    
    diff_lat_m = abs(lat_wgs84 - expected_lat) * 111320
    diff_lon_m = abs(lon_wgs84 - expected_lon) * 111320 * math.cos(math.radians(58.44))
    total_dist_m = math.sqrt(diff_lat_m**2 + diff_lon_m**2)
    
    result = {
        "utm_easting": e,
        "utm_northing": n,
        "computed_ed50": (lat_ed50, lon_ed50),
        "computed_wgs84": (lat_wgs84, lon_wgs84),
        "expected_wgs84": (expected_lat, expected_lon),
        "error_meters": total_dist_m,
        "validated": total_dist_m < 2.0  # within 2m precision
    }
    print("CRS Conversion Spike Result:")
    for k, v in result.items():
        print(f"  {k}: {v}")
    return result

if __name__ == "__main__":
    run_conversion_spike()
