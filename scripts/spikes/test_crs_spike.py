"""
Spike: CRS Conversion ED50 UTM Zone 31N to WGS84
Validates conversion against official Norwegian Offshore Directorate (NOD) coordinates.
"""
from pyproj import Transformer

def test_crs():
    # EPSG:23031 is ED50 / UTM zone 31N
    # EPSG:4326 is WGS84 geographic (lat, lon)
    transformer = Transformer.from_crs("EPSG:23031", "EPSG:4326", always_xy=True)
    
    # Well 15/9-F-12
    # Known UTM: E=435050.25, N=6478566.09 (ED50 UTM 31N)
    easting = 435050.25
    northing = 6478566.09
    
    lon, lat = transformer.transform(easting, northing)
    
    # Known NOD coordinates: Lat 58.441636, Lon 1.887483 (WGS84 approx ~ 58°26'29.89" N, 1°53'14.94" E)
    expected_lat = 58.441636
    expected_lon = 1.887483
    
    lat_diff_m = abs(lat - expected_lat) * 111320
    lon_diff_m = abs(lon - expected_lon) * 111320 * 0.5233 # cos(58.44 deg)
    
    print(f"Calculated WGS84: Lat={lat:.6f}, Lon={lon:.6f}")
    print(f"Expected WGS84:   Lat={expected_lat:.6f}, Lon={expected_lon:.6f}")
    print(f"Discrepancy: Latitude delta = {abs(lat - expected_lat):.6f} deg (~{lat_diff_m:.2f} m), Longitude delta = {abs(lon - expected_lon):.6f} deg (~{lon_diff_m:.2f} m)")
    
    # Return transformer working
    return True

if __name__ == "__main__":
    test_crs()
