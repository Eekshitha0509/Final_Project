# load_room_data_fixed.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hostelproject.settings')
django.setup()

from applications.models import Block, Floor, Room

def create_blocks_floors_rooms():
    """Create all blocks, floors, and rooms based on your frontend data"""
    
    print("Starting data migration...")
    print("Clearing existing data...")
    
    # Clear existing data
    Room.objects.all().delete()
    Floor.objects.all().delete()
    Block.objects.all().delete()
    
    print("\nCreating Blocks...")
    
    # Create Blocks
    orange_block = Block.objects.create(
        name='orange',
        display_name='Orange Hostel',
        total_floors=6,
        description='Orange Hostel - For 1st and 4th Year Students'
    )
    print("OK Created: " + orange_block.display_name)
    
    meta_block = Block.objects.create(
        name='meta',
        display_name='Meta H Hostel',
        total_floors=3,
        description='Meta H Hostel - For 2nd Year Students'
    )
    print("OK Created: " + meta_block.display_name)
    
    alumini_block = Block.objects.create(
        name='alumini',
        display_name='Alumini Hostel',
        total_floors=3,
        description='Alumini Hostel - For 3rd Year Students'
    )
    print(f"OK Created: {alumini_block.display_name}")
    
    # ========== ORANGE HOSTEL ==========
    print("\nCreating Orange Block floors and rooms...")
    
    # Ground Floor (floor_number=0)
    floor_0 = Floor.objects.create(
        block=orange_block,
        floor_number=0,
        total_rooms=9
    )
    print(f"  Created Floor 0 (Ground) with ID: {floor_0.id}")
    
    # Rooms 1-7 (2 sharing)
    for i in range(1, 8):
        Room.objects.create(
            floor=floor_0,
            room_number=str(i),
            room_type='regular',
            capacity=2,
            price_per_semester=13000
        )
    # Washrooms on ground floor
    Room.objects.create(floor=floor_0, room_number='W1', room_type='washroom')
    Room.objects.create(floor=floor_0, room_number='W2', room_type='washroom')
    
    # First Floor (floor_number=1)
    floor_1 = Floor.objects.create(
        block=orange_block,
        floor_number=1,
        total_rooms=18
    )
    print(f"  Created Floor 1 with ID: {floor_1.id}")
    
    capacities_1 = {
        8: 2, 9: 3, 10: 3, 11: 3, 12: 3, 13: 3, 14: 4,
        15: 2, 16: 4, 17: 4, 18: 2, 19: 4, 20: 2, 21: 2,
        22: 3, 23: 2
    }
    for i in range(8, 24):
        capacity = capacities_1.get(i, 4)
        Room.objects.create(
            floor=floor_1,
            room_number=str(i),
            room_type='regular',
            capacity=capacity,
            price_per_semester=13000
        )
    # Washrooms on first floor
    Room.objects.create(floor=floor_1, room_number='W1', room_type='washroom')
    Room.objects.create(floor=floor_1, room_number='W2', room_type='washroom')
    
    # Second Floor (floor_number=2)
    floor_2 = Floor.objects.create(
        block=orange_block,
        floor_number=2,
        total_rooms=10
    )
    print(f"  Created Floor 2 with ID: {floor_2.id}")
    
    capacities_2 = {24: 6, 25: 6, 26: 6, 27: 8, 28: 8, 29: 8, 30: 4, 31: 6}
    for i in range(24, 32):
        capacity = capacities_2.get(i, 4)
        Room.objects.create(
            floor=floor_2,
            room_number=str(i),
            room_type='regular',
            capacity=capacity,
            price_per_semester=13000
        )
    # Washrooms on second floor
    Room.objects.create(floor=floor_2, room_number='W1', room_type='washroom')
    Room.objects.create(floor=floor_2, room_number='W2', room_type='washroom')
    
    # Third Floor (floor_number=3)
    floor_3 = Floor.objects.create(
        block=orange_block,
        floor_number=3,
        total_rooms=10
    )
    print(f"  Created Floor 3 with ID: {floor_3.id}")
    
    capacities_3 = {32: 5, 33: 8, 34: 6, 35: 4, 36: 8, 37: 8, 38: 6, 39: 5}
    for i in range(32, 40):
        capacity = capacities_3.get(i, 4)
        Room.objects.create(
            floor=floor_3,
            room_number=str(i),
            room_type='regular',
            capacity=capacity,
            price_per_semester=13000
        )
    # Washrooms on third floor
    Room.objects.create(floor=floor_3, room_number='W1', room_type='washroom')
    Room.objects.create(floor=floor_3, room_number='W2', room_type='washroom')
    
    # Fourth Floor (floor_number=4) - NOW WITH WASHROOMS
    floor_4 = Floor.objects.create(
        block=orange_block,
        floor_number=4,
        total_rooms=10  # 8 regular + 2 washrooms
    )
    print(f"  Created Floor 4 with ID: {floor_4.id} (WITH WASHROOMS)")
    
    capacities_4 = {40: 6, 41: 8, 42: 6, 43: 7, 44: 8, 45: 7, 46: 6, 47: 6}
    for i in range(40, 48):
        capacity = capacities_4.get(i, 4)
        Room.objects.create(
            floor=floor_4,
            room_number=str(i),
            room_type='regular',
            capacity=capacity,
            price_per_semester=10000
        )
    # ADDED WASHROOMS ON FLOOR 4
    Room.objects.create(floor=floor_4, room_number='W1', room_type='washroom')
    Room.objects.create(floor=floor_4, room_number='W2', room_type='washroom')
    
    # Fifth Floor (floor_number=5) - NOW WITH WASHROOMS
    floor_5 = Floor.objects.create(
        block=orange_block,
        floor_number=5,
        total_rooms=10  # 8 regular + 2 washrooms
    )
    print(f"  Created Floor 5 with ID: {floor_5.id} (WITH WASHROOMS)")
    
    capacities_5 = {48: 6, 49: 6, 50: 6, 51: 7, 52: 6, 53: 8, 54: 6, 55: 6}
    for i in range(48, 56):
        capacity = capacities_5.get(i, 4)
        Room.objects.create(
            floor=floor_5,
            room_number=str(i),
            room_type='regular',
            capacity=capacity,
            price_per_semester=10000
        )
    # ADDED WASHROOMS ON FLOOR 5
    Room.objects.create(floor=floor_5, room_number='W1', room_type='washroom')
    Room.objects.create(floor=floor_5, room_number='W2', room_type='washroom')
    
    print(f"OK Orange Hostel: Created {Room.objects.filter(floor__block=orange_block).count()} rooms across {Floor.objects.filter(block=orange_block).count()} floors")
    
    # ========== META HOSTEL ==========
    print("\nCreating Meta H Block floors and rooms...")
    
    # Ground Floor
    meta_0 = Floor.objects.create(
        block=meta_block,
        floor_number=0,
        total_rooms=31
    )
    print(f"  Created Meta Floor 0 with ID: {meta_0.id}")
    
    Room.objects.create(
        floor=meta_0, 
        room_number='1', 
        room_type='office',
        label='Office'
    )
    
    for i in range(2, 30):
        if i == 16:
            Room.objects.create(
                floor=meta_0, 
                room_number='16', 
                room_type='office',
                label='Staff Room'
            )
        else:
            Room.objects.create(
                floor=meta_0,
                room_number=str(i),
                room_type='regular',
                capacity=3,
                price_per_semester=13000
            )
    
    Room.objects.create(floor=meta_0, room_number='W1', room_type='washroom')
    Room.objects.create(floor=meta_0, room_number='W2', room_type='washroom')
    
    # First Floor
    meta_1 = Floor.objects.create(
        block=meta_block,
        floor_number=1,
        total_rooms=32
    )
    print(f"  Created Meta Floor 1 with ID: {meta_1.id}")
    
    for i in range(30, 60):
        Room.objects.create(
            floor=meta_1,
            room_number=str(i),
            room_type='regular',
            capacity=3,
            price_per_semester=13000
        )
    Room.objects.create(floor=meta_1, room_number='W1', room_type='washroom')
    Room.objects.create(floor=meta_1, room_number='W2', room_type='washroom')
    
    # Second Floor
    meta_2 = Floor.objects.create(
        block=meta_block,
        floor_number=2,
        total_rooms=35
    )
    print(f"  Created Meta Floor 2 with ID: {meta_2.id}")
    
    for i in range(60, 91):
        Room.objects.create(
            floor=meta_2,
            room_number=str(i),
            room_type='regular',
            capacity=3,
            price_per_semester=13000
        )
    
    Room.objects.create(
        floor=meta_2,
        room_number='CH1',
        room_type='regular',
        capacity=10,
        price_per_semester=13000,
        label='Common Hall 1'
    )
    
    Room.objects.create(
        floor=meta_2,
        room_number='CH2',
        room_type='regular',
        capacity=10,
        price_per_semester=13000,
        label='Common Hall 2'
    )
    
    Room.objects.create(floor=meta_2, room_number='W1', room_type='washroom')
    Room.objects.create(floor=meta_2, room_number='W2', room_type='washroom')
    
    print(f"OK Meta Hostel: Created {Room.objects.filter(floor__block=meta_block).count()} rooms across {Floor.objects.filter(block=meta_block).count()} floors")
    
    # ========== ALUMINI HOSTEL ==========
    print("\nCreating Alumini Block floors and rooms...")
    
    # Ground Floor
    alumini_0 = Floor.objects.create(
        block=alumini_block,
        floor_number=0,
        total_rooms=110
    )
    print(f"  Created Alumini Floor 0 with ID: {alumini_0.id}")
    
    for i in range(1, 109):
        Room.objects.create(
            floor=alumini_0,
            room_number=str(i),
            room_type='regular',
            capacity=4,
            price_per_semester=13000
        )
    Room.objects.create(floor=alumini_0, room_number='W1', room_type='washroom')
    Room.objects.create(floor=alumini_0, room_number='W2', room_type='washroom')
    
    # First Floor
    alumini_1 = Floor.objects.create(
        block=alumini_block,
        floor_number=1,
        total_rooms=108
    )
    print(f"  Created Alumini Floor 1 with ID: {alumini_1.id}")
    
    for i in range(109, 215):
        Room.objects.create(
            floor=alumini_1,
            room_number=str(i),
            room_type='regular',
            capacity=4,
            price_per_semester=13000
        )
    Room.objects.create(floor=alumini_1, room_number='W1', room_type='washroom')
    Room.objects.create(floor=alumini_1, room_number='W2', room_type='washroom')
    
    # Second Floor
    alumini_2 = Floor.objects.create(
        block=alumini_block,
        floor_number=2,
        total_rooms=20
    )
    print(f"  Created Alumini Floor 2 with ID: {alumini_2.id}")
    
    for i in range(301, 319):
        Room.objects.create(
            floor=alumini_2,
            room_number=str(i),
            room_type='regular',
            capacity=4,
            price_per_semester=13000
        )
    Room.objects.create(floor=alumini_2, room_number='W1', room_type='washroom')
    Room.objects.create(floor=alumini_2, room_number='W2', room_type='washroom')
    
    print(f"OK Alumini Hostel: Created {Room.objects.filter(floor__block=alumini_block).count()} rooms across {Floor.objects.filter(block=alumini_block).count()} floors")
    
    # Summary
    print("\n" + "="*50)
    print("MIGRATION COMPLETE!")
    print("="*50)
    print(f"Total Blocks: {Block.objects.count()}")
    print(f"Total Floors: {Floor.objects.count()}")
    print(f"Total Rooms: {Room.objects.count()}")
    
    # Count rooms by type
    regular_count = Room.objects.filter(room_type='regular').count()
    washroom_count = Room.objects.filter(room_type='washroom').count()
    office_count = Room.objects.filter(room_type='office').count()
    
    print(f"\nRoom Types:")
    print(f"  - Regular Rooms: {regular_count}")
    print(f"  - Washrooms: {washroom_count}")
    print(f"  - Offices: {office_count}")
    print("="*50)

if __name__ == "__main__":
    create_blocks_floors_rooms()